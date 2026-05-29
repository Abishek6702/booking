import { getLogger, serializeError } from "./logger.util";

const shutdownLogger = getLogger("shutdown");

/**
 * Shutdown manager — orchestrates graceful shutdown of the HTTP server,
 * background jobs, and external connections (Prisma, Redis, …).
 *
 * Goals:
 *   - Run cleanup steps in the order they were registered.
 *   - Each step has its own timeout so a hung dependency cannot stall the
 *     others. The overall shutdown also has a hard timeout that triggers
 *     `process.exit(1)` if any step hangs past it.
 *   - Re-entrant calls (e.g. SIGTERM arriving while SIGINT is in progress)
 *     are coalesced into the first invocation.
 *   - Process signal handlers (`SIGINT`, `SIGTERM`) and fatal error handlers
 *     (`uncaughtException`, `unhandledRejection`) all funnel through here,
 *     so the cleanup path is the same regardless of why we're exiting.
 */

export interface ShutdownStep {
  name: string;
  /** Per-step timeout in ms. Defaults to 5_000. */
  timeoutMs?: number;
  fn: () => void | Promise<void>;
}

export interface ShutdownManager {
  register: (step: ShutdownStep) => void;
  /** Programmatic trigger (also called by registered process signals). */
  shutdown: (reason: string) => Promise<void>;
  /** Wire `SIGINT`, `SIGTERM`, `uncaughtException`, `unhandledRejection`. */
  registerProcessHandlers: () => void;
  /** True once shutdown has been initiated. */
  isShuttingDown: () => boolean;
}

interface ShutdownManagerOptions {
  /**
   * Hard ceiling for the entire shutdown. If exceeded, the process is
   * forcibly exited with code 1.
   */
  totalTimeoutMs?: number;
}

const DEFAULT_STEP_TIMEOUT_MS = 5_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 15_000;

const withTimeout = async (
  step: ShutdownStep,
): Promise<{ ok: boolean; err?: unknown; timedOut: boolean }> => {
  const limit = step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;

  let timer: NodeJS.Timeout | undefined;

  try {
    const result = await Promise.race([
      Promise.resolve()
        .then(() => step.fn())
        .then(() => ({ ok: true as const, timedOut: false as const })),
      new Promise<{ ok: false; timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, timedOut: true }), limit);
      }),
    ]);
    return result;
  } catch (err) {
    return { ok: false, err, timedOut: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const createShutdownManager = (
  options: ShutdownManagerOptions = {},
): ShutdownManager => {
  const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const steps: ShutdownStep[] = [];

  let running: Promise<void> | null = null;
  let initiated = false;

  const runShutdown = async (reason: string): Promise<void> => {
    shutdownLogger.info(
      { event: "shutdown_started", reason, stepCount: steps.length },
      "Graceful shutdown initiated",
    );

    // Belt-and-braces: if any single step ignores its own timeout (e.g. a
    // misbehaving native binding), this kills the process.
    const hardKill = setTimeout(() => {
      shutdownLogger.error(
        { event: "shutdown_total_timeout", reason, totalTimeoutMs },
        "Shutdown exceeded total timeout, forcing exit",
      );
      process.exit(1);
    }, totalTimeoutMs);
    hardKill.unref();

    let firstError: unknown = null;

    for (const step of steps) {
      const startedAt = Date.now();
      const result = await withTimeout(step);
      const durationMs = Date.now() - startedAt;

      if (result.ok) {
        shutdownLogger.info(
          { event: "shutdown_step_ok", step: step.name, durationMs },
          `Shutdown step completed: ${step.name}`,
        );
      } else if (result.timedOut) {
        shutdownLogger.error(
          {
            event: "shutdown_step_timeout",
            step: step.name,
            timeoutMs: step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
            durationMs,
          },
          `Shutdown step timed out: ${step.name}`,
        );
        if (!firstError) firstError = new Error(`${step.name} timed out`);
      } else {
        shutdownLogger.error(
          {
            event: "shutdown_step_error",
            step: step.name,
            durationMs,
            err: serializeError(result.err),
          },
          `Shutdown step failed: ${step.name}`,
        );
        if (!firstError) firstError = result.err;
      }
    }

    clearTimeout(hardKill);

    if (firstError) {
      shutdownLogger.error(
        { event: "shutdown_completed_with_errors", reason },
        "Graceful shutdown completed with errors",
      );
      process.exit(1);
    } else {
      shutdownLogger.info(
        { event: "shutdown_completed", reason },
        "Graceful shutdown completed",
      );
      process.exit(0);
    }
  };

  const shutdown = (reason: string): Promise<void> => {
    if (running) {
      shutdownLogger.warn(
        { event: "shutdown_reentered", reason },
        "Shutdown already in progress, ignoring duplicate trigger",
      );
      return running;
    }
    initiated = true;
    running = runShutdown(reason);
    return running;
  };

  const registerProcessHandlers = (): void => {
    const handle = (reason: string) => {
      void shutdown(reason);
    };

    process.on("SIGINT", () => handle("SIGINT"));
    process.on("SIGTERM", () => handle("SIGTERM"));

    // Fatal-error fallthroughs: log structured then funnel into the same
    // shutdown path. We do NOT continue running with corrupted state.
    process.on("uncaughtException", (err) => {
      shutdownLogger.error(
        { event: "uncaught_exception", err: serializeError(err) },
        "Uncaught exception — initiating shutdown",
      );
      handle("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      shutdownLogger.error(
        { event: "unhandled_rejection", err: serializeError(reason) },
        "Unhandled promise rejection — initiating shutdown",
      );
      handle("unhandledRejection");
    });
  };

  return {
    register(step: ShutdownStep) {
      if (initiated) {
        shutdownLogger.warn(
          { event: "shutdown_register_after_start", step: step.name },
          "Shutdown step registered after shutdown started; ignoring",
        );
        return;
      }
      steps.push(step);
    },
    shutdown,
    registerProcessHandlers,
    isShuttingDown: () => initiated,
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Helper: drain an HTTP server.
//
// `server.close()` only stops accepting new connections and waits for active
// ones to drain naturally. Idle keep-alive sockets and SSE streams never
// drain on their own, so we set a short grace window and then forcibly close
// remaining sockets via `server.closeAllConnections()`.
// ────────────────────────────────────────────────────────────────────────────
import type { Server } from "node:http";

export interface DrainHttpServerOptions {
  /** ms to wait for in-flight requests to complete before forcing close. */
  drainGraceMs?: number;
}

export const drainHttpServer = async (
  server: Server,
  options: DrainHttpServerOptions = {},
): Promise<void> => {
  const drainGraceMs = options.drainGraceMs ?? 3_000;

  if (!server.listening) {
    return;
  }

  // Refuse new connections immediately.
  const closePromise = new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // After the grace window, force-close any remaining open connections
  // (keep-alive idle sockets, SSE streams). This unblocks `server.close()`.
  const forceCloseTimer = setTimeout(() => {
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
  }, drainGraceMs);
  forceCloseTimer.unref();

  try {
    await closePromise;
  } finally {
    clearTimeout(forceCloseTimer);
  }
};

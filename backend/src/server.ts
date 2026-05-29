import app from "./app";
import { initializeCache, shutdownCache } from "./config/cache";
import { prisma } from "./config/prisma";
import { startBookingCompletionJob } from "./jobs/booking-completion.job";
import { startBookingExpirationJob } from "./jobs/booking-expiration.job";
import { startExpirePendingRidesScheduler } from "./jobs/expire-pending-rides";
import { getLogger } from "./utils/logger.util";
import {
  createShutdownManager,
  drainHttpServer,
} from "./utils/shutdown.util";

const serverLogger = getLogger("server");

const port = Number(process.env.PORT ?? 4000);

const shutdownManager = createShutdownManager({
  totalTimeoutMs: 15_000,
});

// Wire signal + fatal-error handlers BEFORE we open external resources so
// the shutdown path is in place even if cache/Prisma init throws.
shutdownManager.registerProcessHandlers();

void initializeCache();

const server = app.listen(port, () => {
  serverLogger.info(
    {
      event: "server_started",
      port,
    },
    "Server is running",
  );
});

// Background jobs can be disabled via DISABLE_JOBS=true (useful in tests
// or when running multiple replicas behind a load balancer where only one
// should run jobs).
const jobsEnabled = process.env.DISABLE_JOBS !== "true";

const stopBookingExpirationJob = jobsEnabled ? startBookingExpirationJob() : () => {};
const stopBookingCompletionJob = jobsEnabled ? startBookingCompletionJob() : () => {};
const pendingRidesTimer = jobsEnabled ? startExpirePendingRidesScheduler() : null;

// ──────────────────────────────────────────────────────────────────────────
// Shutdown sequence (registration order is execution order)
//
//   1. Stop accepting new requests + drain in-flight HTTP/SSE connections.
//   2. Stop background jobs and recurring timers (no more DB writes).
//   3. Disconnect Redis cache.
//   4. Disconnect Prisma (closes the pg pool too).
//
// Ordering matters: by stopping the HTTP server first we guarantee no new
// request will start after we begin tearing down DB / cache. Jobs come next
// so their own DB transactions don't race the Prisma disconnect.
// ──────────────────────────────────────────────────────────────────────────

shutdownManager.register({
  name: "http_server",
  timeoutMs: 5_000,
  fn: () => drainHttpServer(server, { drainGraceMs: 3_000 }),
});

shutdownManager.register({
  name: "background_jobs",
  timeoutMs: 2_000,
  fn: () => {
    stopBookingExpirationJob();
    stopBookingCompletionJob();
    if (pendingRidesTimer) clearInterval(pendingRidesTimer);
  },
});

shutdownManager.register({
  name: "redis_cache",
  timeoutMs: 3_000,
  fn: shutdownCache,
});

shutdownManager.register({
  name: "prisma",
  timeoutMs: 3_000,
  fn: () => prisma.$disconnect(),
});

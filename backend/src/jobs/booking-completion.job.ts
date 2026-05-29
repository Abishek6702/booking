import { prisma } from "../config/prisma";
import {
  bookingCompletionBatchSize,
  bookingCompletionMaxBatchesPerRun,
  completeConfirmedBookingsWithOptions,
} from "../services/booking-completion.service";
import { getLogger, serializeError } from "../utils/logger.util";

const bookingCompletionLogger = getLogger("jobs.booking-completion");

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const bookingCompletionIntervalMs = parsePositiveInteger(process.env.BOOKING_COMPLETION_INTERVAL_MS, 300_000);
const bookingCompletionTransactionMaxWaitMs = parsePositiveInteger(
  process.env.BOOKING_COMPLETION_TRANSACTION_MAX_WAIT_MS,
  10_000,
);
const bookingCompletionTransactionTimeoutMs = parsePositiveInteger(
  process.env.BOOKING_COMPLETION_TRANSACTION_TIMEOUT_MS,
  120_000,
);
const bookingCompletionLockNamespace = 41_002;
const bookingCompletionLockKey = 1;

let bookingCompletionTimer: NodeJS.Timeout | null = null;
let isBookingCompletionCycleRunning = false;

const runBookingCompletionCycle = async (): Promise<void> => {
  if (isBookingCompletionCycleRunning) {
    return;
  }

  isBookingCompletionCycleRunning = true;
  const cycleStartedAt = Date.now();

  try {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${bookingCompletionLockNamespace}, ${bookingCompletionLockKey}) AS locked
      `;

      if (!lockRows[0]?.locked) {
        return {
          skipped: true,
          count: 0,
          truncated: false,
        };
      }

      const completed = await completeConfirmedBookingsWithOptions(tx, now, {
        batchSize: bookingCompletionBatchSize,
        maxBatches: bookingCompletionMaxBatchesPerRun,
      });

      return {
        skipped: false,
        count: completed.count,
        truncated: completed.truncated,
      };
    }, {
      maxWait: bookingCompletionTransactionMaxWaitMs,
      timeout: bookingCompletionTransactionTimeoutMs,
    });

    if (result.skipped) {
      return;
    }

    if (result.count > 0) {
      const cycleDurationMs = Date.now() - cycleStartedAt;
      bookingCompletionLogger.info(
        {
          event: "booking_completion_processed",
          completedCount: result.count,
          durationMs: cycleDurationMs,
          truncated: result.truncated,
        },
        "Booking completion cycle processed",
      );
    }
  } catch (error) {
    bookingCompletionLogger.error(
      {
        event: "booking_completion_failed",
        error: serializeError(error),
      },
      "Booking completion job failed",
    );
  } finally {
    isBookingCompletionCycleRunning = false;
  }
};

export const startBookingCompletionJob = (): (() => void) => {
  if (bookingCompletionTimer) {
    return () => {
      if (bookingCompletionTimer) {
        clearInterval(bookingCompletionTimer);
        bookingCompletionTimer = null;
      }
    };
  }

  void runBookingCompletionCycle();

  bookingCompletionTimer = setInterval(() => {
    void runBookingCompletionCycle();
  }, bookingCompletionIntervalMs);

  bookingCompletionTimer.unref();

  return () => {
    if (bookingCompletionTimer) {
      clearInterval(bookingCompletionTimer);
      bookingCompletionTimer = null;
    }
  };
};

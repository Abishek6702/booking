import { prisma } from "../config/prisma";
import {
  bookingExpiryBatchSize,
  bookingExpiryMaxBatchesPerRun,
  expireStaleHoldBookingsWithOptions,
} from "../services/booking-lock.service";
import { getLogger, serializeError } from "../utils/logger.util";

const bookingExpirationLogger = getLogger("jobs.booking-expiration");

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

const bookingExpirationIntervalMs = parsePositiveInteger(process.env.BOOKING_EXPIRY_INTERVAL_MS, 60_000);
const bookingExpirationTransactionMaxWaitMs = parsePositiveInteger(
  process.env.BOOKING_EXPIRY_TRANSACTION_MAX_WAIT_MS,
  10_000,
);
const bookingExpirationTransactionTimeoutMs = parsePositiveInteger(
  process.env.BOOKING_EXPIRY_TRANSACTION_TIMEOUT_MS,
  120_000,
);
const bookingExpiryLockNamespace = 41_001;
const bookingExpiryLockKey = 1;

let bookingExpirationTimer: NodeJS.Timeout | null = null;
let isBookingExpirationCycleRunning = false;

const runBookingExpirationCycle = async (): Promise<void> => {
  if (isBookingExpirationCycleRunning) {
    return;
  }

  isBookingExpirationCycleRunning = true;
  const cycleStartedAt = Date.now();

  try {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${bookingExpiryLockNamespace}, ${bookingExpiryLockKey}) AS locked
      `;

      if (!lockRows[0]?.locked) {
        return {
          skipped: true,
          count: 0,
        };
      }

      const expired = await expireStaleHoldBookingsWithOptions(tx, now, {
        batchSize: bookingExpiryBatchSize,
        maxBatches: bookingExpiryMaxBatchesPerRun,
      });

      return {
        skipped: false,
        count: expired.count,
      };
    }, {
      maxWait: bookingExpirationTransactionMaxWaitMs,
      timeout: bookingExpirationTransactionTimeoutMs,
    });

    if (result.skipped) {
      return;
    }

    if (result.count > 0) {
      const cycleDurationMs = Date.now() - cycleStartedAt;
      bookingExpirationLogger.info(
        {
          event: "booking_expiry_processed",
          expiredCount: result.count,
          durationMs: cycleDurationMs,
        },
        "Booking expiry cycle processed",
      );
    }
  } catch (error) {
    bookingExpirationLogger.error(
      {
        event: "booking_expiry_failed",
        error: serializeError(error),
      },
      "Booking expiration job failed",
    );
  } finally {
    isBookingExpirationCycleRunning = false;
  }
};

export const startBookingExpirationJob = (): (() => void) => {
  if (bookingExpirationTimer) {
    return () => {
      if (bookingExpirationTimer) {
        clearInterval(bookingExpirationTimer);
        bookingExpirationTimer = null;
      }
    };
  }

  void runBookingExpirationCycle();

  bookingExpirationTimer = setInterval(() => {
    void runBookingExpirationCycle();
  }, bookingExpirationIntervalMs);

  bookingExpirationTimer.unref();

  return () => {
    if (bookingExpirationTimer) {
      clearInterval(bookingExpirationTimer);
      bookingExpirationTimer = null;
    }
  };
};

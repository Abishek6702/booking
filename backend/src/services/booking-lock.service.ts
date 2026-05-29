import { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { getLogger } from "../utils/logger.util";

const bookingLockLogger = getLogger("services.booking-lock");

type DbClient = Prisma.TransactionClient | typeof prisma;

interface ExpireStaleHoldBookingsOptions {
  batchSize?: number;
  maxBatches?: number;
}

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

const resolvePositiveNumber = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
};

const resolvePaymentFailureAction = (value: string | undefined): PaymentFailureAction => {
  if (!value) {
    return "keep_hold";
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "cancelled" ? "cancelled" : "keep_hold";
};

export type PaymentFailureAction = "keep_hold" | "cancelled";

export const bookingHoldDurationMinutes = parsePositiveInteger(process.env.BOOKING_HOLD_DURATION_MINUTES, 10);
export const bookingHoldDurationMs = bookingHoldDurationMinutes * 60_000;
export const bookingExpiryBatchSize = parsePositiveInteger(process.env.BOOKING_EXPIRY_BATCH_SIZE, 1000);
export const bookingExpiryMaxBatchesPerRun = parsePositiveInteger(process.env.BOOKING_EXPIRY_MAX_BATCHES_PER_RUN, 20);
export const bookingPaymentFailureAction = resolvePaymentFailureAction(process.env.BOOKING_PAYMENT_FAILURE_ACTION);

export const computeHoldExpiry = (from: Date = new Date()): Date => {
  return new Date(from.getTime() + bookingHoldDurationMs);
};

export const isExpiredHold = (expiresAt: Date | null | undefined, now: Date = new Date()): boolean => {
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() <= now.getTime();
};

export const buildAvailabilityBlockingBookingWhere = (now: Date = new Date()): Prisma.BookingWhereInput => {
  return {
    OR: [
      { status: BookingStatus.CONFIRMED },
      // Backward-compatible guard for pre-HOLD records.
      { status: BookingStatus.PENDING },
      {
        status: BookingStatus.HOLD,
        expiresAt: {
          gt: now,
        },
      },
    ],
  };
};

export const expireStaleHoldBookings = async (db: DbClient = prisma, now: Date = new Date()) => {
  return expireStaleHoldBookingsWithOptions(db, now);
};

export const expireStaleHoldBookingsWithOptions = async (
  db: DbClient = prisma,
  now: Date = new Date(),
  options: ExpireStaleHoldBookingsOptions = {},
) => {
  const batchSize = resolvePositiveNumber(options.batchSize, bookingExpiryBatchSize);
  const maxBatches = resolvePositiveNumber(options.maxBatches, bookingExpiryMaxBatchesPerRun);

  let totalExpired = 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const staleHolds = await db.booking.findMany({
      where: {
        status: BookingStatus.HOLD,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              lte: now,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      orderBy: [
        {
          expiresAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: batchSize,
    });

    if (staleHolds.length === 0) {
      break;
    }

    const updateResult = await db.booking.updateMany({
      where: {
        id: {
          in: staleHolds.map((booking) => booking.id),
        },
        status: BookingStatus.HOLD,
      },
      data: {
        status: BookingStatus.EXPIRED,
        expiresAt: null,
      },
    });

    totalExpired += updateResult.count;

    if (staleHolds.length < batchSize) {
      break;
    }
  }

  if (totalExpired > 0) {
    bookingLockLogger.info(
      {
        event: "bookings_expired_bulk",
        expiredCount: totalExpired,
      },
      "Expired stale booking holds",
    );
  }

  return {
    count: totalExpired,
  };
};

export const expireBookingHoldIfNeeded = async (
  db: DbClient,
  booking: { id: string; status: BookingStatus; expiresAt: Date | null },
  now: Date = new Date(),
): Promise<boolean> => {
  if (booking.status !== BookingStatus.HOLD || !isExpiredHold(booking.expiresAt, now)) {
    return false;
  }

  const updateResult = await db.booking.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.HOLD,
    },
    data: {
      status: BookingStatus.EXPIRED,
      expiresAt: null,
    },
  });

  if (updateResult.count > 0) {
    bookingLockLogger.info(
      {
        event: "booking_expired_single",
        bookingId: booking.id,
      },
      "Expired booking hold",
    );
  }

  return updateResult.count > 0;
};

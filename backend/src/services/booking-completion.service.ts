import { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { getLogger } from "../utils/logger.util";

const bookingCompletionServiceLogger = getLogger("services.booking-completion");

interface CompleteConfirmedBookingsOptions {
  batchSize?: number;
  maxBatches?: number;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

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

export const bookingCompletionBatchSize = parsePositiveInteger(process.env.BOOKING_COMPLETION_BATCH_SIZE, 500);
export const bookingCompletionMaxBatchesPerRun = parsePositiveInteger(process.env.BOOKING_COMPLETION_MAX_BATCHES, 20);

export const isBookingDueForCompletion = (checkOut: Date, now: Date = new Date()): boolean => {
  return checkOut.getTime() <= now.getTime();
};

export const completeBookingIfDue = async (
  db: DbClient = prisma,
  booking: { id: string; status: BookingStatus; checkOut: Date },
  now: Date = new Date(),
): Promise<boolean> => {
  if (booking.status !== BookingStatus.CONFIRMED || !isBookingDueForCompletion(booking.checkOut, now)) {
    return false;
  }

  const completed = await db.booking.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.CONFIRMED,
      checkOut: {
        lte: now,
      },
    },
    data: {
      status: BookingStatus.COMPLETED,
    },
  });

  if (completed.count > 0) {
    bookingCompletionServiceLogger.info(
      {
        event: "booking_completed_single",
        bookingId: booking.id,
      },
      "Completed confirmed booking",
    );
  }

  return completed.count > 0;
};

export const completeConfirmedBookings = async (db: DbClient = prisma, now: Date = new Date()) => {
  return completeConfirmedBookingsWithOptions(db, now);
};

export const completeConfirmedBookingsWithOptions = async (
  db: DbClient = prisma,
  now: Date = new Date(),
  options: CompleteConfirmedBookingsOptions = {},
) => {
  const batchSize = options.batchSize ?? bookingCompletionBatchSize;
  const maxBatches = options.maxBatches ?? bookingCompletionMaxBatchesPerRun;

  let totalCompleted = 0;
  let batchesRun = 0;
  let hasMore = true;

  while (hasMore && batchesRun < maxBatches) {
    const dueBookings = await db.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        checkOut: {
          lte: now,
        },
      },
      orderBy: {
        checkOut: "asc",
      },
      take: batchSize,
      select: {
        id: true,
      },
    });

    if (dueBookings.length === 0) {
      break;
    }

    const updateResult = await db.booking.updateMany({
      where: {
        id: {
          in: dueBookings.map((booking) => booking.id),
        },
        status: BookingStatus.CONFIRMED,
        checkOut: {
          lte: now,
        },
      },
      data: {
        status: BookingStatus.COMPLETED,
      },
    });

    if (updateResult.count > 0) {
      bookingCompletionServiceLogger.info(
        {
          event: "bookings_completed_batch",
          completedCount: updateResult.count,
        },
        "Completed confirmed bookings in batch",
      );
    }

    totalCompleted += updateResult.count;
    batchesRun += 1;
    hasMore = dueBookings.length === batchSize;
  }

  return {
    count: totalCompleted,
    batchesRun,
    truncated: hasMore && batchesRun >= maxBatches,
  };
};

import { ListingModerationStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { buildAvailabilityBlockingBookingWhere, expireStaleHoldBookings } from "./booking-lock.service";
import { ApiError } from "../utils/error.util";
import { CACHE_TTL_SECONDS, withReadThroughCache } from "../utils/cache.util";
import { buildStayAvailabilityCacheKey } from "../utils/cache-keys.util";

const roomSelect = {
  id: true,
  stayId: true,
  name: true,
  pricePerNight: true,
  maxGuests: true,
  bedType: true,
  amenities: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomSelect;

const ensureValidDateRange = (checkIn: Date, checkOut: Date): void => {
  const now = new Date();

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new ApiError(400, "Invalid checkIn/checkOut date");
  }

  if (checkIn.getTime() < now.getTime() || checkOut.getTime() < now.getTime()) {
    throw new ApiError(400, "Past dates are not allowed");
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new ApiError(400, "checkOut must be greater than checkIn");
  }
};

const overlapWhere = (checkIn: Date, checkOut: Date, excludeBookingId?: string): Prisma.BookingWhereInput => ({
  ...buildAvailabilityBlockingBookingWhere(),
  ...(excludeBookingId
    ? {
        id: {
          not: excludeBookingId,
        },
      }
    : {}),
  checkIn: {
    lt: checkOut,
  },
  checkOut: {
    gt: checkIn,
  },
});

export const ensureRoomAvailability = async (
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) => {
  ensureValidDateRange(checkIn, checkOut);
  await expireStaleHoldBookings(prisma);

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      roomId,
      ...overlapWhere(checkIn, checkOut, excludeBookingId),
    },
    select: {
      id: true,
    },
  });

  if (conflictingBooking) {
    throw new ApiError(409, "Room is not available for selected dates");
  }
};

export const ensureVehicleAvailability = async (
  vehicleId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) => {
  ensureValidDateRange(checkIn, checkOut);
  await expireStaleHoldBookings(prisma);

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      vehicleId,
      ...overlapWhere(checkIn, checkOut, excludeBookingId),
    },
    select: {
      id: true,
    },
  });

  if (conflictingBooking) {
    throw new ApiError(409, "Vehicle is not available for selected dates");
  }
};

export const ensureAttractionAvailability = async (
  attractionId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) => {
  ensureValidDateRange(checkIn, checkOut);
  await expireStaleHoldBookings(prisma);

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      attractionId,
      ...overlapWhere(checkIn, checkOut, excludeBookingId),
    },
    select: {
      id: true,
    },
  });

  if (conflictingBooking) {
    throw new ApiError(409, "Attraction is not available for selected dates");
  }
};

export const getAvailableRooms = async (stayId: string, checkIn: Date, checkOut: Date) => {
  ensureValidDateRange(checkIn, checkOut);
  const cacheKey = buildStayAvailabilityCacheKey(stayId, {
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
  });

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.availability, async () => {
    await expireStaleHoldBookings(prisma);

    const stay = await prisma.stay.findFirst({
      where: {
        id: stayId,
        moderationStatus: ListingModerationStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!stay) {
      throw new ApiError(404, "Stay not found");
    }

    const rooms = await prisma.room.findMany({
      where: {
        stayId,
        bookings: {
          none: {
            ...overlapWhere(checkIn, checkOut),
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: roomSelect,
    });

    return {
      rooms,
    };
  });
};

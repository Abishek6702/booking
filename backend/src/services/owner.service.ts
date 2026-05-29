import { AccountReviewStatus, BookingStatus, PaymentStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma";
import { SubmitOwnerVerificationInput } from "../schemas/owner.schema";
import { ApiError } from "../utils/error.util";

const msInDay = 24 * 60 * 60 * 1000;

type DateBucketRow = {
  date: Date | string;
};

type BookingsOverTimeRow = DateBucketRow & {
  count: number | bigint | string;
};

type RevenueOverTimeRow = DateBucketRow & {
  revenue: number | bigint | string;
};

type BookedDaysRow = {
  bookedDays: number | bigint | string | null;
};

const toDateBucket = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const toNumber = (value: number | bigint | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ownerStatusSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  ownerStatus: true,
  documents: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const getOwnerDashboard = async (ownerId: string) => {
  const [totalProperties, totalBookings, activeBookings, revenueAggregate, recentBookingsRaw] = await Promise.all([
    prisma.stay.count({
      where: { ownerId },
    }),
    prisma.booking.count({
      where: {
        stay: { ownerId },
        status: { not: BookingStatus.CANCELLED },
      },
    }),
    prisma.booking.count({
      where: {
        stay: { ownerId },
        status: { not: BookingStatus.CANCELLED },
      },
    }),
    prisma.payment.aggregate({
      where: {
        booking: {
          stay: { ownerId },
        },
        status: PaymentStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        stay: { ownerId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        checkIn: true,
        checkOut: true,
        totalPrice: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        stay: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const recentBookings = recentBookingsRaw.map((b) => ({
    id: b.id,
    status: b.status.toLowerCase(),
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    totalAmount: toNumber(b.totalPrice as unknown as number | bigint | string | null),
    createdAt: b.createdAt,
    guest: {
      name: b.user?.name ?? "Guest",
      email: b.user?.email ?? "",
    },
    roomName: b.room?.name ?? b.stay?.title ?? "Property",
  }));

  return {
    totalProperties,
    totalBookings,
    activeBookings,
    totalRevenue: toNumber(revenueAggregate._sum.amount as unknown as number | bigint | string | null),
    recentBookings,
  };
};

export const getOwnerAnalytics = async (ownerId: string) => {
  const [
    totalProperties,
    bookingRange,
    bookingsOverTimeRows,
    revenueOverTimeRows,
    bookedDaysRows,
  ] = await Promise.all([
    prisma.stay.count({
      where: { ownerId },
    }),
    prisma.booking.aggregate({
      where: {
        stay: {
          ownerId,
        },
        status: {
          not: BookingStatus.CANCELLED,
        },
      },
      _min: {
        checkIn: true,
      },
      _max: {
        checkOut: true,
      },
    }),
    prisma.$queryRaw<BookingsOverTimeRow[]>(Prisma.sql`
      SELECT
        DATE(b."createdAt") AS "date",
        COUNT(*)::int AS "count"
      FROM "Booking" b
      JOIN "Stay" s ON s."id" = b."stayId"
      WHERE s."ownerId" = ${ownerId}
        AND b."status" <> ${"cancelled"}
      GROUP BY DATE(b."createdAt")
      ORDER BY DATE(b."createdAt") ASC
    `),
    prisma.$queryRaw<RevenueOverTimeRow[]>(Prisma.sql`
      SELECT
        DATE(p."createdAt") AS "date",
        COALESCE(SUM(p."amount"), 0)::numeric AS "revenue"
      FROM "Payment" p
      JOIN "Booking" b ON b."id" = p."bookingId"
      JOIN "Stay" s ON s."id" = b."stayId"
      WHERE s."ownerId" = ${ownerId}
        AND p."status" = ${"success"}
      GROUP BY DATE(p."createdAt")
      ORDER BY DATE(p."createdAt") ASC
    `),
    prisma.$queryRaw<BookedDaysRow[]>(Prisma.sql`
      SELECT
        COALESCE(
          SUM(
            GREATEST(
              1,
              CEIL(EXTRACT(EPOCH FROM (b."checkOut" - b."checkIn")) / 86400.0)
            )
          ),
          0
        )::numeric AS "bookedDays"
      FROM "Booking" b
      JOIN "Stay" s ON s."id" = b."stayId"
      WHERE s."ownerId" = ${ownerId}
        AND b."status" <> ${"cancelled"}
    `),
  ]);

  let occupancyRate = 0;

  if (totalProperties > 0 && bookingRange._min.checkIn && bookingRange._max.checkOut) {
    const rangeMs = bookingRange._max.checkOut.getTime() - bookingRange._min.checkIn.getTime();
    const rangeDays = Math.max(1, Math.ceil(rangeMs / msInDay));
    const totalAvailableDays = totalProperties * rangeDays;
    const bookedDays = toNumber(bookedDaysRows[0]?.bookedDays);

    if (totalAvailableDays > 0) {
      occupancyRate = bookedDays / totalAvailableDays;
    }
  }

  return {
    bookingsOverTime: bookingsOverTimeRows.map((row) => ({
      date: toDateBucket(row.date),
      count: toNumber(row.count),
    })),
    revenueOverTime: revenueOverTimeRows.map((row) => ({
      date: toDateBucket(row.date),
      revenue: toNumber(row.revenue),
    })),
    occupancyRate,
  };
};

export const submitOwnerVerification = async (
  ownerId: string,
  payload: SubmitOwnerVerificationInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "Owner not found");
  }

  if (user.role !== UserRole.OWNER) {
    throw new ApiError(403, "Only owners can submit verification documents");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      documents: payload.documents,
      ownerStatus: AccountReviewStatus.PENDING,
    },
    select: ownerStatusSelect,
  });
};

export const getOwnerStatus = async (ownerId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: ownerStatusSelect,
  });

  if (!user) {
    throw new ApiError(404, "Owner not found");
  }

  if (user.role !== UserRole.OWNER) {
    throw new ApiError(403, "Only owners can access verification status");
  }

  return user;
};


// ────────────────────────────────────────────────────────────────────────────
// DEV-ONLY helpers
//
// These exist purely so QA / smoke-test scripts can move owners and listings
// past moderation without round-tripping through an admin reviewer. The
// controller guards them with `NODE_ENV !== "production"`, but defence-in-
// depth: this service is also where the real logic lives so a future caller
// can't accidentally misuse it.
// ────────────────────────────────────────────────────────────────────────────

import { ListingModerationStatus } from "@prisma/client";
import { invalidateCacheByPrefixes } from "../utils/cache.util";
import {
  buildStayAvailabilityCachePrefix,
  buildStayDetailCacheKey,
  STAYS_SEARCH_CACHE_PREFIX,
} from "../utils/cache-keys.util";

const ensureNonProductionOrThrow = (): void => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "This endpoint is not available in production");
  }
};

export const devApproveOwner = async (ownerId: string) => {
  ensureNonProductionOrThrow();

  return prisma.user.update({
    where: { id: ownerId },
    data: {
      ownerStatus: AccountReviewStatus.APPROVED,
    },
    select: {
      id: true,
      email: true,
      ownerStatus: true,
    },
  });
};

export const devApproveStay = async (ownerId: string, stayId: string) => {
  ensureNonProductionOrThrow();

  const stay = await prisma.stay.findFirst({
    where: { id: stayId, ownerId },
    select: { id: true, title: true, moderationStatus: true },
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found or you do not own this listing");
  }

  const updated = await prisma.stay.update({
    where: { id: stayId },
    data: { moderationStatus: ListingModerationStatus.APPROVED },
    select: { id: true, title: true, moderationStatus: true },
  });

  await invalidateCacheByPrefixes([
    STAYS_SEARCH_CACHE_PREFIX,
    buildStayDetailCacheKey(stayId),
    buildStayAvailabilityCachePrefix(stayId),
  ]);

  return updated;
};

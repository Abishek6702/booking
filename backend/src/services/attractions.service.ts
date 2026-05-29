import { AuditAction, AuditEntityType, ListingModerationStatus, Prisma } from "@prisma/client";

import {
  CreateAttractionInput,
  CreateAttractionSlotInput,
  GetAttractionSlotsQueryInput,
  SearchAttractionsInput,
  UpdateAttractionInput,
  UpdateAttractionSlotInput,
} from "../schemas/attractions.schema";
import { prisma } from "../config/prisma";
import { buildAvailabilityBlockingBookingWhere, expireStaleHoldBookings } from "./booking-lock.service";
import { ApiError } from "../utils/error.util";
import { CACHE_TTL_SECONDS, invalidateCacheByPrefixes, withReadThroughCache } from "../utils/cache.util";
import {
  ATTRACTIONS_SEARCH_CACHE_PREFIX,
  buildAttractionAvailabilityCachePrefix,
  buildAttractionAvailabilityCacheKey,
  buildAttractionDetailCacheKey,
  buildAttractionsSearchCacheKey,
  buildAttractionSlotsCacheKey,
  buildAttractionSlotsCachePrefix,
} from "../utils/cache-keys.util";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";

const attractionSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  price: true,
  images: true,
  location: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AttractionSelect;

const attractionSlotSelect = {
  id: true,
  attractionId: true,
  date: true,
  startTime: true,
  endTime: true,
  capacity: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AttractionSlotSelect;

const parseSlotDate = (date: string): Date => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid slot date");
  }

  return parsed;
};

const parseSlotTime = (time: string): { hours: number; minutes: number } => {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new ApiError(400, "Invalid slot time");
  }

  return { hours, minutes };
};

const ensureNoOverlappingSlot = async (
  attractionId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeSlotId?: string,
) => {
  const overlap = await prisma.attractionSlot.findFirst({
    where: {
      attractionId,
      date,
      ...(excludeSlotId
        ? {
            id: {
              not: excludeSlotId,
            },
          }
        : {}),
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlap) {
    throw new ApiError(409, "Slot time overlaps with an existing slot");
  }
};

const ensureSlotIsMutable = async (slotId: string, action: "update" | "delete") => {
  await expireStaleHoldBookings(prisma);

  const activeBookingCount = await prisma.booking.count({
    where: {
      slotId,
      ...buildAvailabilityBlockingBookingWhere(),
    },
  });

  if (activeBookingCount > 0) {
    if (action === "update") {
      throw new ApiError(409, "Cannot update slot because active bookings already consumed capacity");
    }

    throw new ApiError(409, "Cannot delete slot because active bookings already consumed capacity");
  }
};

const toAttractionAuditSnapshot = (attraction: {
  id: string;
  title: string;
  type: string;
  price: Prisma.Decimal;
}): Record<string, unknown> => {
  return {
    id: attraction.id,
    title: attraction.title,
    type: attraction.type,
    price: attraction.price.toString(),
  };
};

export const searchAttractions = async (filters: SearchAttractionsInput) => {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;
  const cacheKey = buildAttractionsSearchCacheKey(filters);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.search, async () => {
    const where: Prisma.AttractionWhereInput = {};

    if (filters.q) {
      where.OR = [
        {
          title: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
        {
          location: {
            path: ["city"],
            string_contains: filters.q,
          },
        },
      ];
    }

    if (filters.type) {
      where.type = {
        contains: filters.type,
        mode: "insensitive",
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {
        ...(filters.minPrice !== undefined ? { gte: new Prisma.Decimal(filters.minPrice) } : {}),
        ...(filters.maxPrice !== undefined ? { lte: new Prisma.Decimal(filters.maxPrice) } : {}),
      };
    }

    const [total, attractions] = await prisma.$transaction([
      prisma.attraction.count({ where }),
      prisma.attraction.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: attractionSelect,
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      attractions,
    };
  });
};

export const getFeaturedAttractions = async (limit: number) => {
  return withReadThroughCache(`attractions:featured:${limit}`, CACHE_TTL_SECONDS.search, async () => {
    const attractions = await prisma.attraction.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: attractionSelect,
    });

    return attractions;
  });
};

export const getAttractionById = async (id: string) => {
  const cacheKey = buildAttractionDetailCacheKey(id);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.detail, async () => {
    const attraction = await prisma.attraction.findFirst({
      where: { id },
      select: attractionSelect,
    });

    if (!attraction) {
      throw new ApiError(404, "Attraction not found");
    }

    return attraction;
  });
};

export const createAttraction = async (adminId: string, payload: CreateAttractionInput) => {
  return prisma.$transaction(async (tx) => {
    const attraction = await tx.attraction.create({
      data: {
        title: payload.title,
        description: payload.description,
        type: payload.type,
        price: new Prisma.Decimal(payload.price),
        images: payload.images ?? [],
        location: payload.location as Prisma.InputJsonObject,
      },
      select: attractionSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_CREATED,
      entityType: AuditEntityType.ATTRACTION,
      entityId: attraction.id,
      metadata: {
        after: toAttractionAuditSnapshot(attraction),
      },
    });

    return attraction;
  });
};

export const bulkCreateAttractions = async (adminId: string, payloads: CreateAttractionInput[]) => {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const payload of payloads) {
      const attraction = await tx.attraction.create({
        data: {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          price: new Prisma.Decimal(payload.price),
          images: payload.images ?? [],
          location: payload.location as Prisma.InputJsonObject,
        },
        select: attractionSelect,
      });

      await writeAuditLog(tx, {
        userId: adminId,
        action: AuditAction.LISTING_CREATED,
        entityType: AuditEntityType.ATTRACTION,
        entityId: attraction.id,
        metadata: {
          after: toAttractionAuditSnapshot(attraction),
        },
      });
      results.push(attraction);
    }

    await invalidateCacheByPrefixes([ATTRACTIONS_SEARCH_CACHE_PREFIX]);
    return results;
  });
};

export const updateAttraction = async (adminId: string, id: string, payload: UpdateAttractionInput) => {
  const existingAttraction = await prisma.attraction.findUnique({
    where: { id },
    select: attractionSelect,
  });

  if (!existingAttraction) {
    throw new ApiError(404, "Attraction not found");
  }

  const data: Prisma.AttractionUpdateInput = {};

  if (payload.title !== undefined) data.title = payload.title;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.type !== undefined) data.type = payload.type;
  if (payload.price !== undefined) data.price = new Prisma.Decimal(payload.price);
  if (payload.images !== undefined) data.images = payload.images;
  if (payload.location !== undefined) data.location = payload.location as Prisma.InputJsonObject;

  const attraction = await prisma.$transaction(async (tx) => {
    const updatedAttraction = await tx.attraction.update({
      where: { id },
      data,
      select: attractionSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_UPDATED,
      entityType: AuditEntityType.ATTRACTION,
      entityId: updatedAttraction.id,
      metadata: buildBeforeAfterMetadata(
        toAttractionAuditSnapshot(existingAttraction),
        toAttractionAuditSnapshot(updatedAttraction),
      ),
    });

    return updatedAttraction;
  });

  await invalidateCacheByPrefixes([
    ATTRACTIONS_SEARCH_CACHE_PREFIX,
    buildAttractionDetailCacheKey(id),
    buildAttractionSlotsCachePrefix(id),
  ]);

  return attraction;
};

export const deleteAttraction = async (adminId: string, id: string) => {
  const existingAttraction = await prisma.attraction.findUnique({
    where: { id },
    select: attractionSelect,
  });

  if (!existingAttraction) {
    throw new ApiError(404, "Attraction not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attraction.delete({
      where: { id },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_DELETED,
      entityType: AuditEntityType.ATTRACTION,
      entityId: id,
      metadata: buildBeforeAfterMetadata(toAttractionAuditSnapshot(existingAttraction), {
        deleted: true,
      }),
    });
  });

  await invalidateCacheByPrefixes([
    ATTRACTIONS_SEARCH_CACHE_PREFIX,
    buildAttractionDetailCacheKey(id),
    buildAttractionSlotsCachePrefix(id),
  ]);

  return {};
};

export const getAttractionSlots = async (attractionId: string, query: GetAttractionSlotsQueryInput) => {
  const cacheKey = buildAttractionSlotsCacheKey(attractionId, query);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.attractionSlots, async () => {
    await expireStaleHoldBookings(prisma);

    const attraction = await prisma.attraction.findUnique({
      where: { id: attractionId },
      select: { id: true },
    });

    if (!attraction) {
      throw new ApiError(404, "Attraction not found");
    }

    const where: Prisma.AttractionSlotWhereInput = {
      attractionId: attraction.id,
      ...(query.date ? { date: parseSlotDate(query.date) } : {}),
    };

    const slots = await prisma.attractionSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: attractionSlotSelect,
    });

    return {
      attractionId: attraction.id,
      slots: slots.map((slot) => ({
        ...slot,
        remainingCapacity: slot.capacity,
        available: slot.capacity > 0,
      })),
    };
  });
};

export const toggleSlotStatus = async (_userId: string, attractionId: string, slotId: string) => {
  const existingSlot = await prisma.attractionSlot.findUnique({
    where: { id: slotId },
    select: attractionSlotSelect,
  });

  if (!existingSlot || existingSlot.attractionId !== attractionId) {
    throw new ApiError(404, "Attraction slot not found");
  }

  const updatedSlot = await prisma.attractionSlot.update({
    where: { id: slotId },
    data: {
      capacity: existingSlot.capacity > 0 ? 0 : 50,
    },
    select: attractionSlotSelect,
  });

  await invalidateCacheByPrefixes([
    buildAttractionAvailabilityCachePrefix(attractionId),
    buildAttractionSlotsCachePrefix(attractionId),
  ]);

  return updatedSlot;
};

export const createAttractionSlot = async (
  adminId: string,
  attractionId: string,
  payload: CreateAttractionSlotInput,
) => {
  const attraction = await prisma.attraction.findUnique({
    where: { id: attractionId },
    select: { id: true },
  });

  if (!attraction) {
    throw new ApiError(404, "Attraction not found");
  }

  const slotDate = parseSlotDate(payload.date);
  parseSlotTime(payload.startTime);
  parseSlotTime(payload.endTime);

  if (payload.startTime >= payload.endTime) {
    throw new ApiError(400, "startTime must be less than endTime");
  }

  await ensureNoOverlappingSlot(attractionId, slotDate, payload.startTime, payload.endTime);

  const slot = await prisma.attractionSlot.create({
    data: {
      attractionId,
      date: slotDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      capacity: payload.capacity,
    },
    select: attractionSlotSelect,
  });

  await invalidateCacheByPrefixes([buildAttractionSlotsCachePrefix(attractionId)]);

  return slot;
};

export const updateAttractionSlot = async (
  adminId: string,
  attractionId: string,
  slotId: string,
  payload: UpdateAttractionSlotInput,
) => {
  const existingSlot = await prisma.attractionSlot.findUnique({
    where: { id: slotId },
    select: attractionSlotSelect,
  });

  if (!existingSlot || existingSlot.attractionId !== attractionId) {
    throw new ApiError(404, "Attraction slot not found");
  }

  const nextDate = payload.date ? parseSlotDate(payload.date) : existingSlot.date;
  const nextStartTime = payload.startTime ?? existingSlot.startTime;
  const nextEndTime = payload.endTime ?? existingSlot.endTime;

  if (payload.date || payload.startTime || payload.endTime) {
    await ensureSlotIsMutable(slotId, "update");
    await ensureNoOverlappingSlot(attractionId, nextDate, nextStartTime, nextEndTime, slotId);
  }

  if (nextStartTime >= nextEndTime) {
    throw new ApiError(400, "startTime must be less than endTime");
  }

  const slot = await prisma.attractionSlot.update({
    where: { id: slotId },
    data: {
      ...(payload.date ? { date: nextDate } : {}),
      ...(payload.startTime ? { startTime: nextStartTime } : {}),
      ...(payload.endTime ? { endTime: nextEndTime } : {}),
      ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
    },
    select: attractionSlotSelect,
  });

  await invalidateCacheByPrefixes([buildAttractionSlotsCachePrefix(attractionId)]);

  return slot;
};

export const deleteAttractionSlot = async (adminId: string, attractionId: string, slotId: string) => {
  const existingSlot = await prisma.attractionSlot.findUnique({
    where: { id: slotId },
    select: { id: true, attractionId: true },
  });

  if (!existingSlot || existingSlot.attractionId !== attractionId) {
    throw new ApiError(404, "Attraction slot not found");
  }

  await ensureSlotIsMutable(slotId, "delete");

  await prisma.attractionSlot.delete({
    where: { id: slotId },
  });

  await invalidateCacheByPrefixes([buildAttractionSlotsCachePrefix(attractionId)]);

  return {};
};

export const getAttractionAvailability = async (attractionId: string, checkIn: Date, checkOut: Date) => {
  const cacheKey = buildAttractionAvailabilityCacheKey(attractionId, {
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
  });

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.availability, async () => {
    await expireStaleHoldBookings(prisma);

    const attraction = await prisma.attraction.findUnique({ where: { id: attractionId }, select: { id: true } });
    if (!attraction) {
      throw new ApiError(404, "Attraction not found");
    }

    const slots = await prisma.attractionSlot.findMany({
      where: {
        attractionId,
        date: {
          gte: checkIn,
          lte: checkOut,
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: attractionSlotSelect,
    });

    if (slots.length === 0) {
      return { attractionId, slots: [] };
    }

    const slotIds = slots.map((s) => s.id);

    const bookingCounts = await prisma.booking.groupBy({
      by: ["slotId"],
      where: {
        slotId: { in: slotIds },
        ...buildAvailabilityBlockingBookingWhere(),
      },
      _count: { id: true },
    });

    const countsBySlot: Record<string, number> = {};
    for (const b of bookingCounts) {
      if (b.slotId) {
        countsBySlot[b.slotId] = b._count.id ?? 0;
      }
    }

    return {
      attractionId,
      slots: slots.map((slot) => {
        const booked = countsBySlot[slot.id] ?? 0;
        const remainingCapacity = Math.max(0, slot.capacity - booked);

        return {
          ...slot,
          remainingCapacity,
          available: remainingCapacity > 0,
        };
      }),
    };
  });
};

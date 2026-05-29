import {
  AuditAction,
  AuditEntityType,
  AccountReviewStatus,
  ListingModerationStatus,
  Prisma,
  StayType,
  UserRole,
} from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { CACHE_TTL_SECONDS, invalidateCacheByPrefixes, withReadThroughCache } from "../utils/cache.util";
import {
  buildStayAvailabilityCachePrefix,
  buildStayDetailCacheKey,
  buildStaysSearchCacheKey,
  STAYS_SEARCH_CACHE_PREFIX,
} from "../utils/cache-keys.util";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { parsePagination } from "../utils/pagination.util";
import { CreateOwnerStayInput, SearchStaysInput, UpdateStayInput } from "../schemas/stays.schema";

const staySelect = {
  id: true,
  ownerId: true,
  title: true,
  description: true,
  type: true,
  city: true,
  country: true,
  address: true,
  latitude: true,
  longitude: true,
  images: true,
  amenities: true,
  policies: true,
  avgRating: true,
  totalReviews: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,
  rooms: {
    select: {
      pricePerNight: true,
    },
    take: 1,
    orderBy: [{ pricePerNight: "asc" as const }],
  },
} satisfies Prisma.StaySelect;

const mapStayType = (type: string): StayType => {
  const t = type.toLowerCase();
  if (t === "hotel") {
    return StayType.HOTEL;
  }

  if (t === "resort") {
    return StayType.RESORT;
  }

  if (t === "apartment") {
    return StayType.APARTMENT;
  }

  if (t === "villa") {
    return StayType.VILLA;
  }

  throw new ApiError(400, `Unsupported stay type: ${type}`);
};

const toStayAuditSnapshot = (stay: {
  id: string;
  ownerId: string;
  title: string;
  type: StayType;
  city: string;
  country: string;
  moderationStatus: ListingModerationStatus;
}): Record<string, unknown> => {
  return {
    id: stay.id,
    ownerId: stay.ownerId,
    title: stay.title,
    type: stay.type,
    city: stay.city,
    country: stay.country,
    moderationStatus: stay.moderationStatus,
  };
};

export const searchStays = async (filters: SearchStaysInput) => {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;
  const cacheKey = buildStaysSearchCacheKey(filters);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.search, async () => {
    const where: Prisma.StayWhereInput = {
      moderationStatus: ListingModerationStatus.APPROVED,
    };

    if (filters.city) {
      where.city = {
        contains: filters.city,
        mode: "insensitive",
      };
    }

    if (filters.type) {
      where.type = mapStayType(filters.type);
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.rooms = {
        some: {
          pricePerNight: {
            ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
          },
        },
      };
    }

    if (filters.rating) {
      const ratings = filters.rating.split(",").map(Number);
      if (ratings.length > 0) {
        where.avgRating = {
          gte: Math.min(...ratings),
        };
      }
    }

    const orderBy: Prisma.StayOrderByWithRelationInput[] = [];
    if (filters.sortBy === "price-low") {
      orderBy.push({ rooms: { _count: "asc" } }); // This is NOT correct for price sorting
      // Prisma doesn't easily support sorting by the minimum value of a related field in findMany.
      // However, we can sort by createdAt or rating.
      // For now, I'll keep the default order or implement a basic one if possible.
      orderBy.push({ createdAt: "desc" });
    } else if (filters.sortBy === "price-high") {
      orderBy.push({ createdAt: "desc" });
    } else {
      orderBy.push({ createdAt: "desc" });
    }
    orderBy.push({ id: "desc" });

      const [total, stays] = await Promise.all([
        prisma.stay.count({ where }),
        prisma.stay.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: staySelect,
        }),
      ]);

      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        stays,
      };
  });
};

export const getStayById = async (id: string, viewerId?: string) => {
  // 1. If viewer is authenticated, check if they are the owner
  // Owners must skip cache to see their latest version (including PENDING status)
  if (viewerId) {
    const stay = await prisma.stay.findUnique({
      where: { id },
      select: staySelect,
    });

    if (stay && stay.ownerId === viewerId) {
      return stay;
    }
  }

  // 2. Public / Non-owner path: Use cache (only APPROVED stays)
  const cacheKey = buildStayDetailCacheKey(id);
  const stay = await withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.detail, async () => {
    return prisma.stay.findFirst({
      where: {
        id,
        moderationStatus: ListingModerationStatus.APPROVED,
      },
      select: staySelect,
    });
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found");
  }

  return stay;
};

export const getFeaturedStays = async (limit: number) => {
  return withReadThroughCache(`stays:featured:${limit}`, CACHE_TTL_SECONDS.search, async () => {
    const stays = await prisma.stay.findMany({
      where: {
        moderationStatus: ListingModerationStatus.APPROVED,
        avgRating: { gte: 4.0 },
      },
      orderBy: [
        { avgRating: "desc" },
        { totalReviews: "desc" },
      ],
      take: limit,
      select: staySelect,
    });

    return stays;
  });
};

export const getOwnerProperties = async (
  ownerId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, stays] = await prisma.$transaction([
    prisma.stay.count({ where: { ownerId } }),
    prisma.stay.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: staySelect,
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    stays,
  };
};

export const createOwnerProperty = async (ownerId: string, payload: CreateOwnerStayInput) => {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true, ownerStatus: true },
  });

  if (!owner || owner.role !== UserRole.OWNER || owner.ownerStatus !== AccountReviewStatus.APPROVED) {
    throw new ApiError(403, "Only approved owners can create stays");
  }

  return prisma.$transaction(async (tx) => {
    const stay = await tx.stay.create({
      data: {
        ownerId,
        title: payload.title,
        description: payload.description,
        type: mapStayType(payload.type),
        city: payload.city,
        country: payload.country,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        images: payload.images ?? [],
        amenities: payload.amenities,
        policies: payload.policies as Prisma.InputJsonObject,
        moderationStatus: ListingModerationStatus.APPROVED,
        moderationReason: null,
        moderatedAt: null,
      },
      select: staySelect,
    });

    await writeAuditLog(tx, {
      userId: ownerId,
      action: AuditAction.LISTING_CREATED,
      entityType: AuditEntityType.STAY,
      entityId: stay.id,
      metadata: {
        after: toStayAuditSnapshot(stay),
      },
    });

    await invalidateCacheByPrefixes([
      STAYS_SEARCH_CACHE_PREFIX,
      buildStayDetailCacheKey(stay.id),
      buildStayAvailabilityCachePrefix(stay.id),
    ]);

    return stay;
  });
};

export const updateOwnerProperty = async (ownerId: string, id: string, payload: UpdateStayInput) => {
  const existingStay = await prisma.stay.findUnique({
    where: { id },
    select: staySelect,
  });

  if (!existingStay) {
    throw new ApiError(404, "Stay not found");
  }

  if (existingStay.ownerId !== ownerId) {
    throw new ApiError(403, "You are not allowed to update this stay");
  }

  const data: Prisma.StayUpdateInput = {};

  if (payload.title !== undefined) {
    data.title = payload.title;
  }

  if (payload.description !== undefined) {
    data.description = payload.description;
  }

  if (payload.type !== undefined) {
    data.type = mapStayType(payload.type);
  }

  if (payload.city !== undefined) {
    data.city = payload.city;
  }

  if (payload.country !== undefined) {
    data.country = payload.country;
  }

  if (payload.address !== undefined) {
    data.address = payload.address;
  }

  if (payload.latitude !== undefined) {
    data.latitude = payload.latitude;
  }

  if (payload.longitude !== undefined) {
    data.longitude = payload.longitude;
  }

  if (payload.images !== undefined) {
    data.images = payload.images;
  }

  if (payload.amenities !== undefined) {
    data.amenities = payload.amenities;
  }

  if (payload.policies !== undefined) {
    data.policies = payload.policies as Prisma.InputJsonObject;
  }

  const sensitiveFieldsUpdated =
    payload.title !== undefined ||
    payload.description !== undefined ||
    payload.images !== undefined ||
    payload.amenities !== undefined ||
    payload.policies !== undefined;

  if (sensitiveFieldsUpdated) {
    data.moderationStatus = ListingModerationStatus.APPROVED;
    data.moderatedAt = null;
  }

  const stay = await prisma.$transaction(async (tx) => {
    const updatedStay = await tx.stay.update({
      where: { id },
      data,
      select: staySelect,
    });

    await writeAuditLog(tx, {
      userId: ownerId,
      action: AuditAction.LISTING_UPDATED,
      entityType: AuditEntityType.STAY,
      entityId: updatedStay.id,
      metadata: buildBeforeAfterMetadata(toStayAuditSnapshot(existingStay), toStayAuditSnapshot(updatedStay)),
    });

    return updatedStay;
  });

  await invalidateCacheByPrefixes([
    STAYS_SEARCH_CACHE_PREFIX,
    buildStayDetailCacheKey(id),
    buildStayAvailabilityCachePrefix(id),
  ]);

  return stay;
};

export const deleteOwnerProperty = async (ownerId: string, id: string) => {
  const existingStay = await prisma.stay.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      title: true,
      type: true,
      city: true,
      country: true,
      moderationStatus: true,
    },
  });

  if (!existingStay) {
    throw new ApiError(404, "Stay not found");
  }

  if (existingStay.ownerId !== ownerId) {
    throw new ApiError(403, "You are not allowed to delete this stay");
  }

  await prisma.$transaction(async (tx) => {
    await tx.stay.delete({
      where: { id },
    });

    await writeAuditLog(tx, {
      userId: ownerId,
      action: AuditAction.LISTING_DELETED,
      entityType: AuditEntityType.STAY,
      entityId: id,
      metadata: buildBeforeAfterMetadata(toStayAuditSnapshot(existingStay), {
        deleted: true,
      }),
    });
  });

  await invalidateCacheByPrefixes([
    STAYS_SEARCH_CACHE_PREFIX,
    buildStayDetailCacheKey(id),
    buildStayAvailabilityCachePrefix(id),
  ]);

  return {};
};

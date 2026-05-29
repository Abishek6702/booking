import {
  AuditAction,
  AuditEntityType,
  DriverStatus,
  ListingModerationStatus,
  Prisma,
  VehicleType,
} from "@prisma/client";

import {
  CreateVehicleInput,
  SearchVehiclesInput,
  UpdateVehicleInput,
  VehicleAvailabilityQueryInput,
} from "../schemas/vehicles.schema";
import { prisma } from "../config/prisma";
import { buildAvailabilityBlockingBookingWhere, expireStaleHoldBookings } from "./booking-lock.service";
import { ApiError } from "../utils/error.util";
import { CACHE_TTL_SECONDS, invalidateCacheByPrefixes, withReadThroughCache } from "../utils/cache.util";
import {
  buildVehicleAvailabilityCacheKey,
  buildVehicleAvailabilityCachePrefix,
  buildVehicleDetailCacheKey,
  buildVehiclesSearchCacheKey,
  VEHICLES_SEARCH_CACHE_PREFIX,
} from "../utils/cache-keys.util";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { parsePagination } from "../utils/pagination.util";

const vehicleSelect = {
  id: true,
  driverId: true,
  type: true,
  brand: true,
  model: true,
  seats: true,
  pricePerKm: true,
  images: true,
  isActive: true,
  title: true,
  description: true,
  serviceMode: true,
  baseFare: true,
  pricePerHour: true,
  capacity: true,
  location: true,
  city: true,
  latitude: true,
  longitude: true,
  avgRating: true,
  totalReviews: true,
  moderationStatus: true,
  createdAt: true,
  updatedAt: true,
  driver: {
    select: {
      name: true,
      phone: true,
    },
  },
} satisfies Prisma.VehicleSelect;

const mapVehicleType = (value: string): VehicleType => {
  const normalized = value.toLowerCase();
  if (normalized === "bike") {
    return VehicleType.BIKE;
  }

  if (normalized === "van") {
    return VehicleType.VAN;
  }

  return VehicleType.CAR;
};

const toVehicleAuditSnapshot = (vehicle: {
  id: string;
  driverId: string;
  type: VehicleType;
  brand: string;
  model: string;
  seats: number;
  pricePerKm: Prisma.Decimal;
  isActive: boolean;
}): Record<string, unknown> => {
  return {
    id: vehicle.id,
    driverId: vehicle.driverId,
    type: vehicle.type,
    brand: vehicle.brand,
    model: vehicle.model,
    seats: vehicle.seats,
    pricePerKm: vehicle.pricePerKm.toString(),
    isActive: vehicle.isActive,
  };
};

const ensureApprovedDriver = async (driverId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      driverStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.driverStatus !== DriverStatus.APPROVED) {
    throw new ApiError(403, "Only approved drivers can manage vehicles");
  }
};

export const searchVehicles = async (filters: SearchVehiclesInput) => {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;
  const cacheKey = buildVehiclesSearchCacheKey(filters);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.search, async () => {
    const where: Prisma.VehicleWhereInput = {
      isActive: true,
      moderationStatus: ListingModerationStatus.APPROVED,
      // Only show vehicles whose driver is currently online
      driver: {
        isDriverOnline: true,
        driverStatus: DriverStatus.APPROVED,
      },
    };

    if (filters.city) {
      where.city = {
        equals: filters.city.trim(),
        mode: "insensitive",
      };
    } else {
      // No city filter — show all vehicles (including those with city = NULL)
      // so existing vehicles registered before city was added remain visible
    }

    if (filters.q) {
      where.OR = [
        {
          brand: {
            contains: filters.q,
            mode: "insensitive",
          },
        },
        {
          model: {
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
      ];
    }

    if (filters.type) {
      where.type = mapVehicleType(filters.type);
    }

    if (filters.minSeats !== undefined || filters.maxSeats !== undefined) {
      where.seats = {
        ...(filters.minSeats !== undefined
          ? {
              gte: filters.minSeats,
            }
          : {}),
        ...(filters.maxSeats !== undefined
          ? {
              lte: filters.maxSeats,
            }
          : {}),
      };
    }

    if (filters.minPricePerKm !== undefined || filters.maxPricePerKm !== undefined) {
      where.pricePerKm = {
        ...(filters.minPricePerKm !== undefined
          ? {
              gte: new Prisma.Decimal(filters.minPricePerKm),
            }
          : {}),
        ...(filters.maxPricePerKm !== undefined
          ? {
              lte: new Prisma.Decimal(filters.maxPricePerKm),
            }
          : {}),
      };
    }

    const [total, vehicles] = await prisma.$transaction([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: vehicleSelect,
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      vehicles: vehicles.map((v: any) => ({
        ...v,
        image: v.images?.[0] || "",
        rating: Number(v.avgRating) || 0,
        reviews: v.totalReviews || 0,
        capacity: v.capacity || v.seats || 0,
      })),
    };
  });
};

export const getFeaturedVehicles = async (limit: number) => {
  return withReadThroughCache(`vehicles:featured:${limit}`, CACHE_TTL_SECONDS.search, async () => {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        moderationStatus: ListingModerationStatus.APPROVED,
        avgRating: { gte: 4.0 },
        // Only feature vehicles whose driver is currently online
        driver: {
          isDriverOnline: true,
        },
      },
      orderBy: [
        { avgRating: "desc" },
        { totalReviews: "desc" },
      ],
      take: limit,
      select: vehicleSelect,
    });

    return vehicles.map((v: any) => ({
      ...v,
      image: v.images?.[0] || "",
      rating: Number(v.avgRating) || 0,
      reviews: v.totalReviews || 0,
      capacity: v.capacity || v.seats || 0,
    }));
  });
};

export const getVehicleById = async (id: string, viewerId?: string) => {
  if (viewerId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { driverId: viewerId },
          {
            moderationStatus: ListingModerationStatus.APPROVED,
            driver: {
              isDriverOnline: true,
            },
          },
        ],
      },
      select: vehicleSelect,
    });

    if (!vehicle) {
      throw new ApiError(404, "Vehicle not found");
    }

    return vehicle;
  }

  const cacheKey = buildVehicleDetailCacheKey(id);

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.detail, async () => {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        isActive: true,
        // Don't serve vehicle detail pages for offline drivers
        driver: {
          isDriverOnline: true,
        },
      },
      select: vehicleSelect,
    });

    if (!vehicle) {
      throw new ApiError(404, "Vehicle not found");
    }

    return vehicle;
  });
};

export const getDriverVehicles = async (
  driverId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, vehicles] = await prisma.$transaction([
    prisma.vehicle.count({ where: { driverId } }),
    prisma.vehicle.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: vehicleSelect,
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    vehicles,
  };
};

export const createVehicle = async (driverId: string, payload: CreateVehicleInput) => {
  await ensureApprovedDriver(driverId);

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        driverId,
        type: mapVehicleType(payload.type),
        brand: payload.brand,
        model: payload.model,
        seats: payload.seats,
        pricePerKm: new Prisma.Decimal(payload.pricePerKm),
        images: payload.images ?? [],
        isActive: payload.isActive ?? true,
        city: payload.city ? payload.city.trim() : null,
        latitude: payload.latitude != null ? new Prisma.Decimal(payload.latitude) : null,
        longitude: payload.longitude != null ? new Prisma.Decimal(payload.longitude) : null,
      },
      select: vehicleSelect,
    });

    await writeAuditLog(tx, {
      userId: driverId,
      action: AuditAction.LISTING_CREATED,
      entityType: AuditEntityType.VEHICLE,
      entityId: vehicle.id,
      metadata: {
        after: toVehicleAuditSnapshot(vehicle),
      },
    });

    return vehicle;
  });
};

export const updateVehicle = async (driverId: string, id: string, payload: UpdateVehicleInput) => {
  await ensureApprovedDriver(driverId);

  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: vehicleSelect,
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  if (existingVehicle.driverId !== driverId) {
    throw new ApiError(403, "You are not allowed to update this vehicle");
  }

  const data: Prisma.VehicleUpdateInput = {};

  if (payload.type !== undefined) {
    data.type = mapVehicleType(payload.type);
  }

  if (payload.brand !== undefined) {
    data.brand = payload.brand;
  }

  if (payload.model !== undefined) {
    data.model = payload.model;
  }

  if (payload.seats !== undefined) {
    data.seats = payload.seats;
  }

  if (payload.pricePerKm !== undefined) {
    data.pricePerKm = new Prisma.Decimal(payload.pricePerKm);
  }

  if (payload.images !== undefined) {
    data.images = payload.images;
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  if (payload.city !== undefined) {
    data.city = payload.city ? payload.city.trim() : null;
  }

  if (payload.latitude !== undefined) {
    data.latitude = payload.latitude != null ? new Prisma.Decimal(payload.latitude) : null;
  }

  if (payload.longitude !== undefined) {
    data.longitude = payload.longitude != null ? new Prisma.Decimal(payload.longitude) : null;
  }

  const mergedBrand = payload.brand ?? existingVehicle.brand;
  const mergedModel = payload.model ?? existingVehicle.model;

  const vehicle = await prisma.$transaction(async (tx) => {
    const updatedVehicle = await tx.vehicle.update({
      where: { id },
      data,
      select: vehicleSelect,
    });

    await writeAuditLog(tx, {
      userId: driverId,
      action: AuditAction.LISTING_UPDATED,
      entityType: AuditEntityType.VEHICLE,
      entityId: updatedVehicle.id,
      metadata: buildBeforeAfterMetadata(
        toVehicleAuditSnapshot(existingVehicle),
        toVehicleAuditSnapshot(updatedVehicle),
      ),
    });

    return updatedVehicle;
  });

  await invalidateCacheByPrefixes([
    VEHICLES_SEARCH_CACHE_PREFIX,
    buildVehicleDetailCacheKey(id),
    buildVehicleAvailabilityCachePrefix(id),
  ]);

  return vehicle;
};

export const updateLocation = async (
  driverId: string,
  id: string,
  payload: import("../schemas/vehicles.schema").UpdateVehicleLocationInput,
) => {
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  if (existingVehicle.driverId !== driverId) {
    throw new ApiError(403, "You are not allowed to update this vehicle's location");
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
      } as Prisma.InputJsonObject,
    },
    select: vehicleSelect,
  });

  await invalidateCacheByPrefixes([
    VEHICLES_SEARCH_CACHE_PREFIX,
    buildVehicleDetailCacheKey(id),
    buildVehicleAvailabilityCachePrefix(id),
  ]);

  return updatedVehicle;
};

export const deleteVehicle = async (driverId: string, id: string) => {
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: vehicleSelect,
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  if (existingVehicle.driverId !== driverId) {
    throw new ApiError(403, "You are not allowed to delete this vehicle");
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.delete({
      where: { id },
    });

    await writeAuditLog(tx, {
      userId: driverId,
      action: AuditAction.LISTING_DELETED,
      entityType: AuditEntityType.VEHICLE,
      entityId: id,
      metadata: buildBeforeAfterMetadata(toVehicleAuditSnapshot(existingVehicle), {
        deleted: true,
      }),
    });
  });

  await invalidateCacheByPrefixes([
    VEHICLES_SEARCH_CACHE_PREFIX,
    buildVehicleDetailCacheKey(id),
    buildVehicleAvailabilityCachePrefix(id),
  ]);

  return {};
};

export const getAvailableCities = async (): Promise<string[]> => {
  // Return all cities that have at least one approved active vehicle,
  // regardless of whether the driver is currently online.
  // The vehicle list itself filters by isDriverOnline — this just populates
  // the city selector so customers can always pick a city.
  const rows = await prisma.vehicle.findMany({
    where: {
      isActive: true,
      moderationStatus: ListingModerationStatus.APPROVED,
      city: { not: null },
    },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return rows.map((v) => v.city).filter(Boolean) as string[];
};

export const getVehicleAvailability = async (id: string, query: VehicleAvailabilityQueryInput) => {
  const checkIn = new Date(query.checkIn);
  const checkOut = new Date(query.checkOut);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new ApiError(400, "Invalid checkIn/checkOut date");
  }

  const now = new Date();
  if (checkIn.getTime() < now.getTime() || checkOut.getTime() < now.getTime()) {
    throw new ApiError(400, "Past dates are not allowed");
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new ApiError(400, "checkOut must be greater than checkIn");
  }

  if (checkIn.getTime() === checkOut.getTime()) {
    throw new ApiError(400, "startTime cannot be equal to endTime");
  }

  const cacheKey = buildVehicleAvailabilityCacheKey(id, {
    checkIn: query.checkIn,
    checkOut: query.checkOut,
  });

  return withReadThroughCache(cacheKey, CACHE_TTL_SECONDS.availability, async () => {
    await expireStaleHoldBookings(prisma);

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!vehicle) {
      throw new ApiError(404, "Vehicle not found");
    }

    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId: vehicle.id,
        ...buildAvailabilityBlockingBookingWhere(),
        checkIn: {
          lt: checkOut,
        },
        checkOut: {
          gt: checkIn,
        },
      },
      select: {
        id: true,
      },
    });

    return {
      vehicleId: vehicle.id,
      checkIn,
      checkOut,
      available: !overlappingBooking,
    };
  });
};

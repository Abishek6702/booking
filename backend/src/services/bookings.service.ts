import { createHash } from "node:crypto";

import {
  AuditAction,
  AuditEntityType,
  BookingIdempotencyStatus,
  BookingStatus,
  BookingType,
  ListingModerationStatus,
  Prisma,
  VehicleServiceMode,
} from "@prisma/client";

import { prisma } from "../config/prisma";
import {
  CancelBookingInput,
  CreateBookingInput,
  PreviewBookingInput,
  UpdateBookingInput,
} from "../schemas/bookings.schema";
import {
  buildAvailabilityBlockingBookingWhere,
  computeHoldExpiry,
  expireBookingHoldIfNeeded,
  expireStaleHoldBookings,
} from "./booking-lock.service";
import { completeBookingIfDue } from "./booking-completion.service";
import * as rideLifecycle from "./ride-lifecycle.service";
import { ApiError } from "../utils/error.util";
import { getLogger, serializeError } from "../utils/logger.util";
import { invalidateCacheByPrefixes } from "../utils/cache.util";
import { calculateTripMetrics } from "./maps.service";
import {
  buildAttractionAvailabilityCachePrefix,
  buildAttractionSlotsCachePrefix,
  buildStayAvailabilityCachePrefix,
  buildVehicleAvailabilityCachePrefix,
} from "../utils/cache-keys.util";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { parsePagination } from "../utils/pagination.util";

const bookingsLogger = getLogger("services.bookings");

const bookingSelect = {
  id: true,
  userId: true,
  stayId: true,
  roomId: true,
  vehicleId: true,
  attractionId: true,
  slotId: true,
  vehicleServiceMode: true,
  pickupAddress: true,
  dropoffAddress: true,
  vehicleDistanceKm: true,
  vehicleDurationHours: true,
  type: true,
  checkIn: true,
  checkOut: true,
  guests: true,
  guestDetails: true,
  totalPrice: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookingSelect;

const bookingMutationSelect = {
  ...bookingSelect,
} satisfies Prisma.BookingSelect;

const roomPricingSelect = {
  id: true,
  stayId: true,
  pricePerNight: true,
  maxGuests: true,
} satisfies Prisma.RoomSelect;

const vehiclePricingSelect = {
  id: true,
  driverId: true,
  pricePerKm: true,
  baseFare: true,
  pricePerHour: true,
  isActive: true,
} satisfies Prisma.VehicleSelect;

const attractionPricingSelect = {
  id: true,
  price: true,
} satisfies Prisma.AttractionSelect;

const attractionSlotSelect = {
  id: true,
  attractionId: true,
  date: true,
  startTime: true,
  endTime: true,
  capacity: true,
} satisfies Prisma.AttractionSlotSelect;

type BookingMutationRecord = Prisma.BookingGetPayload<{ select: typeof bookingMutationSelect }>;
type BookingResponsePayload = Prisma.BookingGetPayload<{ select: typeof bookingSelect }>;

const bookingIdempotencySelect = {
  id: true,
  userId: true,
  idempotencyKey: true,
  requestHash: true,
  status: true,
  bookingId: true,
  responseData: true,
} satisfies Prisma.BookingIdempotencySelect;

const invalidateAvailabilityCachesForBooking = async (booking: BookingResponsePayload): Promise<void> => {
  const prefixes: string[] = [];

  if (booking.stayId) {
    prefixes.push(buildStayAvailabilityCachePrefix(booking.stayId));
  }

  if (booking.vehicleId) {
    prefixes.push(buildVehicleAvailabilityCachePrefix(booking.vehicleId));
  }

  if (booking.attractionId) {
    prefixes.push(buildAttractionAvailabilityCachePrefix(booking.attractionId));
    prefixes.push(buildAttractionSlotsCachePrefix(booking.attractionId));
  }

  if (prefixes.length > 0) {
    await invalidateCacheByPrefixes(prefixes);
  }
};

interface BookingEntityInput {
  stayId?: string;
  roomId?: string;
  vehicleId?: string;
  vehicleServiceMode?: "ride_hailing";
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupLocation?: string;
  dropLocation?: string;
  vehicleDistanceKm?: number;
  distance?: number;
  vehicleDurationHours?: number;
  attractionId?: string;
  slotId?: string;
  type?: "stay" | "vehicle" | "attraction";
  checkIn?: string;
  checkOut?: string;
  startTime?: string;
  endTime?: string;
}

interface ResolvedBookingEntity {
  type: BookingType;
  stayId: string | null;
  roomId: string | null;
  roomMaxGuests: number | null;
  vehicleId: string | null;
  vehicleServiceMode: VehicleServiceMode | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  vehicleDistanceKm: number | null;
  vehicleDurationHours: number | null;
  vehicleBaseFare: Prisma.Decimal | null;
  vehiclePricePerKm: Prisma.Decimal | null;
  vehiclePricePerHour: Prisma.Decimal | null;
  attractionId: string | null;
  slotId: string | null;
  checkIn?: Date;
  checkOut?: Date;
  unitPrice: Prisma.Decimal;
}

interface DurationBreakdown {
  nights: number;
  days: number;
  hours: number;
}

interface PriceBreakdown {
  basePrice: Prisma.Decimal;
  totalNights: number;
  duration: DurationBreakdown;
  taxes: Prisma.Decimal | null;
  serviceFee: Prisma.Decimal | null;
  totalAmount: Prisma.Decimal;
}

interface VehicleFareBreakdown {
  baseFare: Prisma.Decimal;
  distanceKm: number;
  pricePerKm: Prisma.Decimal;
  distanceAmount: Prisma.Decimal;
  durationHours: number;
  pricePerHour: Prisma.Decimal;
  durationAmount: Prisma.Decimal;
  totalFare: Prisma.Decimal;
}

interface BookingIdempotencyAcquisition {
  replayedResponse: BookingResponsePayload | null;
  idempotencyRecordId: string | null;
}

const toBookingAuditSnapshot = (booking: {
  id: string;
  userId: string;
  type: BookingType;
  status: BookingStatus;
  stayId: string | null;
  roomId: string | null;
  vehicleId: string | null;
  attractionId: string | null;
  slotId: string | null;
  checkIn: Date;
  checkOut: Date;
  totalPrice: Prisma.Decimal;
}): Record<string, unknown> => {
  return {
    id: booking.id,
    userId: booking.userId,
    type: booking.type,
    status: booking.status,
    stayId: booking.stayId,
    roomId: booking.roomId,
    vehicleId: booking.vehicleId,
    attractionId: booking.attractionId,
    slotId: booking.slotId,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
    totalPrice: booking.totalPrice.toString(),
  };
};

const msInDay = 24 * 60 * 60 * 1000;
const msInHour = 60 * 60 * 1000;
const maxGuestCountPerCategory = 1000;

export const sumGuests = (guests: unknown): number => {
  if (!guests || typeof guests !== "object" || guests === null) return 1;
  return Object.values(guests).reduce((acc, curr) => acc + (typeof curr === "number" ? curr : 0), 0);
};


type DbClient = Prisma.TransactionClient | typeof prisma;

const parseRate = (value: string | undefined): Prisma.Decimal => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return new Prisma.Decimal(0);
  }

  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return new Prisma.Decimal(normalized);
};

const bookingTaxRate = parseRate(process.env.BOOKING_TAX_RATE || "0.15");
const bookingServiceFeeRate = parseRate(process.env.BOOKING_SERVICE_FEE_RATE);
const activeBookingStatusesForDuplicateGuard: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

const toStableJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => toStableJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${toStableJson(entryValue)}`);

  return `{${entries.join(",")}}`;
};

const computeBookingRequestHash = (payload: CreateBookingInput): string => {
  const resourceId = payload.roomId || payload.vehicleId || payload.slotId;
  const hashPayload = {
    resourceId,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: payload.guests,
  };
  return createHash("sha256").update(JSON.stringify(hashPayload)).digest("hex");
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const toBookingResponsePayload = (value: Prisma.JsonValue | null): BookingResponsePayload | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as unknown as BookingResponsePayload;
};

const acquireBookingIdempotency = async (
  tx: Prisma.TransactionClient,
  userId: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<BookingIdempotencyAcquisition> => {
  try {
    const created = await tx.bookingIdempotency.create({
      data: {
        userId,
        idempotencyKey,
        requestHash,
        status: BookingIdempotencyStatus.PROCESSING,
      },
      select: bookingIdempotencySelect,
    });

    return {
      replayedResponse: null,
      idempotencyRecordId: created.id,
    };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const existing = await tx.bookingIdempotency.findUnique({
    where: {
      userId_idempotencyKey: {
        userId,
        idempotencyKey,
      },
    },
    select: bookingIdempotencySelect,
  });

  if (!existing) {
    throw new ApiError(409, "Unable to process idempotent booking request. Please retry.");
  }

  if (existing.requestHash !== requestHash) {
    throw new ApiError(409, "idempotencyKey cannot be reused with a different booking payload");
  }

  if (existing.status === BookingIdempotencyStatus.SUCCEEDED) {
    const replayedResponse = toBookingResponsePayload(existing.responseData);

    if (replayedResponse) {
      return {
        replayedResponse,
        idempotencyRecordId: null,
      };
    }

    if (existing.bookingId) {
      const replayBooking = await tx.booking.findUnique({
        where: { id: existing.bookingId },
        select: bookingSelect,
      });

      if (replayBooking) {
        return {
          replayedResponse: replayBooking,
          idempotencyRecordId: null,
        };
      }
    }

    throw new ApiError(409, "idempotencyKey exists but original booking response is unavailable");
  }

  if (existing.status === BookingIdempotencyStatus.PROCESSING) {
    throw new ApiError(409, "A booking request with this idempotencyKey is already in progress");
  }

  await tx.bookingIdempotency.update({
    where: { id: existing.id },
    data: {
      status: BookingIdempotencyStatus.PROCESSING,
      errorMessage: null,
    },
  });

  return {
    replayedResponse: null,
    idempotencyRecordId: existing.id,
  };
};

const ensureNoDuplicateUserBookingIntent = async (
  db: DbClient,
  userId: string,
  entity: ResolvedBookingEntity,
  checkIn: Date,
  checkOut: Date,
): Promise<void> => {
  const now = new Date();
  const activeStatusWhere: Prisma.BookingWhereInput = {
    OR: [
      {
        status: {
          in: activeBookingStatusesForDuplicateGuard,
        },
      },
      {
        status: BookingStatus.HOLD,
        expiresAt: {
          gt: now,
        },
      },
    ],
  };

  let where: Prisma.BookingWhereInput | null = null;

  if (entity.type === BookingType.ATTRACTION && entity.slotId) {
    where = {
      userId,
      slotId: entity.slotId,
      ...activeStatusWhere,
    };
  } else if (entity.type === BookingType.STAY && entity.roomId) {
    where = {
      userId,
      roomId: entity.roomId,
      ...activeStatusWhere,
      checkIn: {
        lt: checkOut,
      },
      checkOut: {
        gt: checkIn,
      },
    };
  } else if (entity.type === BookingType.VEHICLE && entity.vehicleId) {
    where = {
      userId,
      vehicleId: entity.vehicleId,
      ...activeStatusWhere,
      checkIn: {
        lt: checkOut,
      },
      checkOut: {
        gt: checkIn,
      },
    };
  }

  if (!where) {
    return;
  }

  const duplicate = await db.booking.findFirst({
    where,
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new ApiError(409, "Duplicate booking attempt detected for this user and booking intent");
  }
};

/**
 * Prevents listing owners from booking their own properties/vehicles/attractions.
 * This blocks tier farming (inflating lifetimeSpend), fake reviews (reviewing own listing),
 * and self-referencing payment loops.
 */
const ensureUserIsNotListingOwner = async (
  db: DbClient,
  userId: string,
  entity: ResolvedBookingEntity,
): Promise<void> => {
  let ownerId: string | null = null;

  if (entity.type === BookingType.STAY && entity.stayId) {
    const stay = await db.stay.findUnique({
      where: { id: entity.stayId },
      select: { ownerId: true },
    });

    ownerId = stay?.ownerId ?? null;
  } else if (entity.type === BookingType.VEHICLE && entity.vehicleId) {
    const vehicle = await db.vehicle.findUnique({
      where: { id: entity.vehicleId },
      select: { driverId: true },
    });

    ownerId = vehicle?.driverId ?? null;
  }

  if (ownerId && ownerId === userId) {
    throw new ApiError(403, "You cannot book your own listing");
  }
};

const ensureApprovedStayOrThrow = async (db: DbClient, stayId: string) => {
  const stay = await db.stay.findFirst({
    where: {
      id: stayId,
      moderationStatus: ListingModerationStatus.APPROVED,
    },
    select: {
      id: true,
    },
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found");
  }

  return stay;
};

const getRoomOrThrow = async (db: DbClient, roomId: string) => {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: roomPricingSelect,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  await ensureApprovedStayOrThrow(db, room.stayId);

  return room;
};

const getVehicleOrThrow = async (db: DbClient, vehicleId: string) => {
  const vehicle = await db.vehicle.findFirst({
    where: {
      id: vehicleId,
      isActive: true,
    },
    select: vehiclePricingSelect,
  });

  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  return vehicle;
};

const getAttractionOrThrow = async (db: DbClient, attractionId: string) => {
  const attraction = await db.attraction.findUnique({
    where: { id: attractionId },
    select: attractionPricingSelect,
  });

  if (!attraction) {
    throw new ApiError(404, "Attraction not found");
  }

  return attraction;
};

const getAttractionSlotOrThrow = async (db: DbClient, slotId: string) => {
  const slot = await db.attractionSlot.findUnique({
    where: { id: slotId },
    select: attractionSlotSelect,
  });

  if (!slot) {
    throw new ApiError(404, "Attraction slot not found");
  }

  return slot;
};

const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const diffMs = checkOut.getTime() - checkIn.getTime();

  if (diffMs <= 0) {
    throw new ApiError(400, "checkOut must be greater than checkIn");
  }

  const nights = Math.ceil(diffMs / msInDay);

  if (nights <= 0) {
    throw new ApiError(400, "Invalid booking duration");
  }

  return nights;
};

const ensureNoPastDates = (checkIn: Date, checkOut: Date): void => {
  const now = new Date();
  const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

  if (checkIn.getTime() < now.getTime() - GRACE_PERIOD_MS || checkOut.getTime() < now.getTime() - GRACE_PERIOD_MS) {
    throw new ApiError(400, "Past dates are not allowed");
  }

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new ApiError(400, "checkOut must be greater than checkIn");
  }
};

const parseDateOrThrow = (value: string | undefined, field: "checkIn" | "checkOut"): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid ${field}`);
  }

  return parsed;
};

const ensureDateRangeOrThrow = (checkIn?: Date, checkOut?: Date): { checkIn: Date; checkOut: Date } => {
  if (!checkIn || !checkOut) {
    throw new ApiError(400, "checkIn and checkOut are required");
  }

  return { checkIn, checkOut };
};

const parseSlotTime = (value: string): { hours: number; minutes: number } => {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new ApiError(400, "Invalid slot time");
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new ApiError(400, "Invalid slot time");
  }

  return { hours, minutes };
};

const composeSlotDateTime = (date: Date, time: string): Date => {
  const { hours, minutes } = parseSlotTime(time);

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes, 0, 0),
  );
};

const toSlotDateRange = (slot: Prisma.AttractionSlotGetPayload<{ select: typeof attractionSlotSelect }>) => {
  const checkIn = composeSlotDateTime(slot.date, slot.startTime);
  const checkOut = composeSlotDateTime(slot.date, slot.endTime);

  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new ApiError(400, "Invalid slot duration");
  }

  return {
    checkIn,
    checkOut,
  };
};

const ensureNoOverlapForType = async (
  db: DbClient,
  entity: { type: BookingType; id: string },
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
) => {
  await expireStaleHoldBookings(db);

  const fieldName =
    entity.type === BookingType.STAY
      ? "roomId"
      : entity.type === BookingType.VEHICLE
        ? "vehicleId"
        : "attractionId";

  const conflictingBooking = await db.booking.findFirst({
    where: {
      [fieldName]: entity.id,
      ...(entity.type === BookingType.ATTRACTION
        ? {
            slotId: null,
          }
        : {}),
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
    },
    select: {
      id: true,
    },
  });

  if (conflictingBooking) {
    if (entity.type === BookingType.STAY) {
      throw new ApiError(409, "Room is not available for selected dates");
    }

    if (entity.type === BookingType.VEHICLE) {
      throw new ApiError(409, "This driver is currently on another trip. Please choose another vehicle or try again later.");
    }

    throw new ApiError(409, "Attraction is not available for selected dates");
  }
};

const ensureSlotCapacity = async (
  db: DbClient,
  slotId: string,
  capacity: number,
  excludeBookingId?: string,
) => {
  await expireStaleHoldBookings(db);

  const results = await db.booking.findMany({
    where: {
      slotId,
      ...buildAvailabilityBlockingBookingWhere(),
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { guests: true },
  });

  const bookedGuests = results.reduce((acc, b) => acc + sumGuests(b.guests), 0);

  if (bookedGuests >= capacity) {
    throw new ApiError(409, "Selected attraction slot is fully booked");
  }
};

const calculateDuration = (checkIn: Date, checkOut: Date): DurationBreakdown => {
  const diffMs = checkOut.getTime() - checkIn.getTime();

  if (diffMs <= 0) {
    throw new ApiError(400, "checkOut must be greater than checkIn");
  }

  return {
    nights: calculateNights(checkIn, checkOut),
    days: Number((diffMs / msInDay).toFixed(2)),
    hours: Number((diffMs / msInHour).toFixed(2)),
  };
};

const buildVehicleFareBreakdown = (entity: ResolvedBookingEntity): VehicleFareBreakdown | null => {
  if (entity.type !== BookingType.VEHICLE) {
    return null;
  }

  if (
    entity.vehiclePricePerKm === null ||
    entity.vehicleDistanceKm === null
  ) {
    throw new ApiError(400, "Vehicle fare configuration is incomplete");
  }

  if (entity.vehicleDistanceKm <= 0) {
    throw new ApiError(400, "vehicleDistanceKm must be greater than 0");
  }

  const baseFare = entity.vehicleBaseFare ?? new Prisma.Decimal(0);
  const pricePerHour = entity.vehiclePricePerHour ?? new Prisma.Decimal(0);
  const durationHours = entity.vehicleDurationHours ?? 0;
  const distanceAmount = entity.vehiclePricePerKm.mul(new Prisma.Decimal(entity.vehicleDistanceKm));
  const durationAmount = pricePerHour.mul(new Prisma.Decimal(durationHours));

  // totalFare = baseFare + (pricePerKm × distanceKm) + (pricePerHour × durationHours)
  const totalFare = baseFare.add(distanceAmount).add(durationAmount);

  return {
    baseFare,
    distanceKm: entity.vehicleDistanceKm,
    pricePerKm: entity.vehiclePricePerKm,
    distanceAmount,
    durationHours,
    pricePerHour,
    durationAmount,
    totalFare,
  };
};

const calculateBasePrice = (
  entity: ResolvedBookingEntity,
  duration: DurationBreakdown,
  totalGuests: number,
  guestDetails?: any
): Prisma.Decimal => {
  if (entity.type === BookingType.VEHICLE) {
    const vehicleFare = buildVehicleFareBreakdown(entity);
    if (!vehicleFare) {
      throw new ApiError(400, "Vehicle fare configuration is incomplete");
    }

    return vehicleFare.totalFare;
  }

  if (entity.type === BookingType.ATTRACTION && entity.slotId) {
    if (totalGuests <= 0) {
      throw new ApiError(400, "Total guests must be at least 1");
    }
    return entity.unitPrice.mul(new Prisma.Decimal(totalGuests));
  }

  const roomCount = (guestDetails && typeof guestDetails === 'object' && 'roomCount' in guestDetails) ? Math.max(1, Number(guestDetails.roomCount) || 1) : 1;

  return entity.unitPrice.mul(new Prisma.Decimal(duration.nights * roomCount));
};

const buildPriceBreakdown = (
  basePrice: Prisma.Decimal,
  duration: DurationBreakdown,
): PriceBreakdown => {
  const taxEnabled = bookingTaxRate.toNumber() > 0;
  const serviceFeeEnabled = bookingServiceFeeRate.toNumber() > 0;

  const taxes = taxEnabled ? basePrice.mul(bookingTaxRate) : null;
  const serviceFee = serviceFeeEnabled ? basePrice.mul(bookingServiceFeeRate) : null;

  let totalAmount = basePrice;
  if (taxes) {
    totalAmount = totalAmount.add(taxes);
  }

  if (serviceFee) {
    totalAmount = totalAmount.add(serviceFee);
  }

  return {
    basePrice,
    totalNights: duration.nights,
    duration,
    taxes,
    serviceFee,
    totalAmount,
  };
};

const isCheckoutPast = (checkOut: Date): boolean => {
  return checkOut.getTime() <= Date.now();
};

const mapBookingType = (input: BookingEntityInput): BookingType => {
  if (input.type === "stay") {
    return BookingType.STAY;
  }

  if (input.type === "vehicle") {
    return BookingType.VEHICLE;
  }

  if (input.type === "attraction") {
    return BookingType.ATTRACTION;
  }

  if (input.slotId) {
    return BookingType.ATTRACTION;
  }

  if (input.vehicleId) {
    return BookingType.VEHICLE;
  }

  if (input.attractionId) {
    return BookingType.ATTRACTION;
  }

  return BookingType.STAY;
};

const normalizeId = (value: string | null | undefined): string | undefined => {
  const id = value?.trim();
  return id && id.length > 0 ? id : undefined;
};

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value.toNumber();
};

const resolveVehicleTripMetrics = (
  distanceKmInput: number | undefined,
): { distanceKm: number; durationHours: number } => {
  if (distanceKmInput === undefined || !Number.isFinite(distanceKmInput) || distanceKmInput <= 0) {
    throw new ApiError(400, "vehicleDistanceKm must be a positive number for vehicle booking");
  }

  return {
    distanceKm: distanceKmInput,
    durationHours: 0,
  };
};

const normalizeVehicleBookingInput = <T extends BookingEntityInput>(input: T): T & BookingEntityInput => {
  const checkIn = input.checkIn ?? input.startTime;
  const checkOut = input.checkOut ?? input.endTime;
  const pickupAddress = input.pickupAddress ?? input.pickupLocation;
  const dropoffAddress = input.dropoffAddress ?? input.dropLocation;
  const vehicleDistanceKm = input.vehicleDistanceKm ?? input.distance;

  return {
    ...input,
    ...(checkIn !== undefined ? { checkIn } : {}),
    ...(checkOut !== undefined ? { checkOut } : {}),
    ...(pickupAddress !== undefined ? { pickupAddress } : {}),
    ...(dropoffAddress !== undefined ? { dropoffAddress } : {}),
    ...(vehicleDistanceKm !== undefined ? { vehicleDistanceKm } : {}),
  };
};

const ensureGuestCountsForBooking = (guests: unknown, entity: { type: BookingType; roomMaxGuests: number | null }): number => {
  if (!guests || typeof guests !== "object" || Array.isArray(guests)) {
    throw new ApiError(400, "guests must be an object with guest count values");
  }

  const entries = Object.entries(guests as Record<string, unknown>);
  if (entries.length === 0) {
    throw new ApiError(400, "guests must include at least one guest category");
  }

  let totalGuests = 0;

  for (const [key, rawCount] of entries) {
    if (typeof rawCount !== "number" || !Number.isFinite(rawCount) || !Number.isInteger(rawCount)) {
      throw new ApiError(400, `Guest count for ${key} must be an integer`);
    }

    if (rawCount < 0) {
      throw new ApiError(400, `Guest count for ${key} cannot be negative`);
    }

    if (rawCount > maxGuestCountPerCategory) {
      throw new ApiError(400, `Guest count for ${key} is too large`);
    }

    totalGuests += rawCount;
  }

  if (totalGuests < 1) {
    throw new ApiError(400, "Total guests must be at least 1");
  }

  if (entity.type === BookingType.STAY && entity.roomMaxGuests !== null && totalGuests > entity.roomMaxGuests) {
    throw new ApiError(400, "Guest count exceeds room capacity");
  }

  return totalGuests;
};

const validateTypeFieldCombination = (bookingType: BookingType, input: BookingEntityInput) => {
  const stayId = normalizeId(input.stayId);
  const roomId = normalizeId(input.roomId);
  const vehicleId = normalizeId(input.vehicleId);
  const pickupAddress = input.pickupAddress?.trim();
  const dropoffAddress = input.dropoffAddress?.trim();
  const vehicleDistanceKm = input.vehicleDistanceKm;
  const vehicleDurationHours = input.vehicleDurationHours;
  const attractionId = normalizeId(input.attractionId);
  const slotId = normalizeId(input.slotId);

  if (bookingType === BookingType.STAY) {
    if (!stayId) {
      throw new ApiError(400, "stayId is required for stay booking");
    }

    if (!roomId) {
      throw new ApiError(400, "roomId is required for stay booking");
    }

    if (
      vehicleId ||
      input.vehicleServiceMode ||
      pickupAddress ||
      dropoffAddress ||
      vehicleDistanceKm !== undefined ||
      vehicleDurationHours !== undefined ||
      attractionId ||
      slotId
    ) {
      throw new ApiError(
        400,
        "vehicleId, vehicleServiceMode, pickupAddress, dropoffAddress, vehicleDistanceKm, vehicleDurationHours, attractionId and slotId are not allowed for stay booking",
      );
    }

    return;
  }

  if (bookingType === BookingType.VEHICLE) {
    if (!vehicleId) {
      throw new ApiError(400, "vehicleId is required for vehicle booking");
    }

    if (roomId || stayId || attractionId || slotId) {
      throw new ApiError(400, "roomId, stayId, attractionId and slotId are not allowed for vehicle booking");
    }

    if ((pickupAddress && !dropoffAddress) || (!pickupAddress && dropoffAddress)) {
      throw new ApiError(400, "pickupAddress and dropoffAddress must be provided together");
    }

    if (!pickupAddress || !dropoffAddress) {
      throw new ApiError(400, "pickupAddress and dropoffAddress are required for vehicle booking");
    }

    if (vehicleDistanceKm === undefined) {
      throw new ApiError(400, "vehicleDistanceKm is required for vehicle booking");
    }

    return;
  }

  if (!attractionId || !slotId) {
    throw new ApiError(400, "attractionId and slotId are required for attraction booking");
  }

  if (
    roomId ||
    stayId ||
    vehicleId ||
    input.vehicleServiceMode ||
    pickupAddress ||
    dropoffAddress ||
    vehicleDistanceKm !== undefined ||
    vehicleDurationHours !== undefined
  ) {
    throw new ApiError(
      400,
      "roomId, stayId, vehicleId, vehicleServiceMode, pickupAddress, dropoffAddress, vehicleDistanceKm and vehicleDurationHours are not allowed for attraction booking",
    );
  }
};

const resolveSlotBackedAttractionEntity = async (
  db: DbClient,
  slotId: string,
  requestedAttractionId?: string,
  excludeBookingId?: string,
) => {
  // CRITICAL: Lock the slot record to prevent race conditions during capacity check
  await db.$executeRawUnsafe(`SELECT 1 FROM "AttractionSlot" WHERE "id" = $1 FOR UPDATE`, slotId);

  const slot = await getAttractionSlotOrThrow(db, slotId);

  if (requestedAttractionId && requestedAttractionId !== slot.attractionId) {
    throw new ApiError(400, "attractionId does not match slot attraction");
  }

  const attraction = await getAttractionOrThrow(db, slot.attractionId);
  const slotDateRange = toSlotDateRange(slot);

  if (slotDateRange.checkOut.getTime() <= Date.now()) {
    throw new ApiError(400, "Cannot book past attraction slots");
  }

  ensureNoPastDates(slotDateRange.checkIn, slotDateRange.checkOut);

  await ensureNoOverlapForType(
    db,
    { type: BookingType.ATTRACTION, id: attraction.id },
    slotDateRange.checkIn,
    slotDateRange.checkOut,
    excludeBookingId,
  );
  await ensureSlotCapacity(db, slot.id, slot.capacity, excludeBookingId);

  return {
    attraction,
    slot,
    checkIn: slotDateRange.checkIn,
    checkOut: slotDateRange.checkOut,
  };
};

const resolveEntityForCreateOrPreview = async (
  db: DbClient,
  input: BookingEntityInput,
  requestedCheckIn?: Date,
  requestedCheckOut?: Date,
): Promise<ResolvedBookingEntity> => {
  const bookingType = mapBookingType(input);
  validateTypeFieldCombination(bookingType, input);

  if (bookingType === BookingType.STAY) {
    const { checkIn, checkOut } = ensureDateRangeOrThrow(requestedCheckIn, requestedCheckOut);
    const roomId = normalizeId(input.roomId);
    const requestedStayId = normalizeId(input.stayId);

    if (!requestedStayId) {
      throw new ApiError(400, "stayId is required for stay booking");
    }

    const room = await getRoomOrThrow(db, roomId!);
    // CRITICAL: Lock the room record to prevent race conditions during overlap check
    await db.$executeRawUnsafe(`SELECT id FROM "Room" WHERE id = $1 FOR UPDATE`, room.id);
    await ensureNoOverlapForType(db, { type: BookingType.STAY, id: room.id }, checkIn, checkOut);

    if (requestedStayId !== room.stayId) {
      throw new ApiError(400, "stayId does not match room stay");
    }

    return {
      type: BookingType.STAY,
      stayId: room.stayId,
      roomId: room.id,
      roomMaxGuests: room.maxGuests,
      vehicleId: null,
      vehicleServiceMode: null,
      pickupAddress: null,
      dropoffAddress: null,
      vehicleDistanceKm: null,
      vehicleDurationHours: null,
      vehicleBaseFare: null,
      vehiclePricePerKm: null,
      vehiclePricePerHour: null,
      attractionId: null,
      slotId: null,
      unitPrice: room.pricePerNight,
    };
  }

  if (bookingType === BookingType.VEHICLE) {
    const { checkIn, checkOut } = ensureDateRangeOrThrow(requestedCheckIn, requestedCheckOut);
    const vehicleId = normalizeId(input.vehicleId)!;
    const vehicle = await getVehicleOrThrow(db, vehicleId);
    const tripMetrics = resolveVehicleTripMetrics(input.vehicleDistanceKm);

    // CRITICAL: Lock the vehicle record to prevent race conditions during overlap check
    await db.$executeRawUnsafe(`SELECT id FROM "Vehicle" WHERE id = $1 FOR UPDATE`, vehicle.id);
    await ensureNoOverlapForType(db, { type: BookingType.VEHICLE, id: vehicle.id }, checkIn, checkOut);

    return {
      type: BookingType.VEHICLE,
      stayId: null,
      roomId: null,
      roomMaxGuests: null,
      vehicleId: vehicle.id,
      vehicleServiceMode: VehicleServiceMode.RIDE_HAILING,
      pickupAddress: input.pickupAddress?.trim() ?? null,
      dropoffAddress: input.dropoffAddress?.trim() ?? null,
      vehicleDistanceKm: tripMetrics.distanceKm,
      vehicleDurationHours: tripMetrics.durationHours,
      vehicleBaseFare: vehicle.baseFare,
      vehiclePricePerKm: vehicle.pricePerKm,
      vehiclePricePerHour: vehicle.pricePerHour,
      attractionId: null,
      slotId: null,
      unitPrice: vehicle.pricePerKm,
    };
  }

  const slotId = normalizeId(input.slotId)!;
  const attractionId = normalizeId(input.attractionId)!;
  const resolved = await resolveSlotBackedAttractionEntity(db, slotId, attractionId);

  return {
    type: BookingType.ATTRACTION,
    stayId: null,
    roomId: null,
    roomMaxGuests: null,
    vehicleId: null,
    vehicleServiceMode: null,
    pickupAddress: null,
    dropoffAddress: null,
    vehicleDistanceKm: null,
    vehicleDurationHours: null,
    vehicleBaseFare: null,
    vehiclePricePerKm: null,
    vehiclePricePerHour: null,
    attractionId: resolved.attraction.id,
    slotId: resolved.slot.id,
    checkIn: resolved.checkIn,
    checkOut: resolved.checkOut,
    unitPrice: resolved.attraction.price,
  };
};

const resolveEntityForUpdate = async (
  db: DbClient,
  booking: BookingMutationRecord,
  input: BookingEntityInput,
  checkIn: Date,
  checkOut: Date,
  datesChanged: boolean,
): Promise<ResolvedBookingEntity> => {
  if (input.type && mapBookingType(input) !== booking.type) {
    throw new ApiError(400, "Booking type cannot be changed");
  }

  if (booking.type === BookingType.STAY) {
    if (
      input.vehicleId ||
      input.vehicleServiceMode ||
      input.pickupAddress ||
      input.dropoffAddress ||
      input.vehicleDistanceKm !== undefined ||
      input.vehicleDurationHours !== undefined ||
      input.attractionId ||
      input.slotId
    ) {
      throw new ApiError(
        400,
        "vehicleId, vehicleServiceMode, pickupAddress, dropoffAddress, vehicleDistanceKm, vehicleDurationHours, attractionId and slotId are not allowed for stay booking",
      );
    }

    const roomId = normalizeId(input.roomId) ?? normalizeId(booking.roomId ?? undefined);
    const requestedStayId = normalizeId(input.stayId) ?? normalizeId(booking.stayId ?? undefined);

    if (!requestedStayId) {
      throw new ApiError(400, "stayId is required for stay booking");
    }

    if (!roomId) {
      throw new ApiError(400, "roomId is required for stay booking");
    }

    if (datesChanged || roomId !== booking.roomId) {
      // CRITICAL: Lock the room record to prevent race conditions during overlap check
      await db.$executeRawUnsafe(`SELECT id FROM "Room" WHERE id = $1 FOR UPDATE`, roomId);
      await ensureNoOverlapForType(db, { type: BookingType.STAY, id: roomId }, checkIn, checkOut, booking.id);
    }

    const room = await getRoomOrThrow(db, roomId);

    if (requestedStayId !== room.stayId) {
      throw new ApiError(400, "stayId does not match room stay");
    }

    return {
      type: BookingType.STAY,
      stayId: room.stayId,
      roomId: room.id,
      roomMaxGuests: room.maxGuests,
      vehicleId: null,
      vehicleServiceMode: null,
      pickupAddress: null,
      dropoffAddress: null,
      vehicleDistanceKm: null,
      vehicleDurationHours: null,
      vehicleBaseFare: null,
      vehiclePricePerKm: null,
      vehiclePricePerHour: null,
      attractionId: null,
      slotId: null,
      unitPrice: room.pricePerNight,
    };
  }

  if (booking.type === BookingType.VEHICLE) {
    if (input.roomId || input.stayId || input.attractionId || input.slotId) {
      throw new ApiError(400, "roomId, stayId, attractionId and slotId are not allowed for vehicle booking");
    }

    const vehicleId = normalizeId(input.vehicleId) ?? normalizeId(booking.vehicleId ?? undefined);

    if (!vehicleId) {
      throw new ApiError(400, "vehicleId is required for vehicle booking");
    }

    const pickupAddress = input.pickupAddress?.trim() ?? booking.pickupAddress ?? null;
    const dropoffAddress = input.dropoffAddress?.trim() ?? booking.dropoffAddress ?? null;

    if ((pickupAddress && !dropoffAddress) || (!pickupAddress && dropoffAddress)) {
      throw new ApiError(400, "pickupAddress and dropoffAddress must be provided together");
    }

    if (!pickupAddress || !dropoffAddress) {
      throw new ApiError(400, "pickupAddress and dropoffAddress are required for vehicle booking");
    }

    if (datesChanged || vehicleId !== booking.vehicleId) {
      // CRITICAL: Lock the vehicle record to prevent race conditions during overlap check
      await db.$executeRawUnsafe(`SELECT id FROM "Vehicle" WHERE id = $1 FOR UPDATE`, vehicleId);
      await ensureNoOverlapForType(db, { type: BookingType.VEHICLE, id: vehicleId }, checkIn, checkOut, booking.id);
    }

    const vehicle = await getVehicleOrThrow(db, vehicleId);
    const distanceKm = input.vehicleDistanceKm ?? decimalToNumber(booking.vehicleDistanceKm);
    const tripMetrics = resolveVehicleTripMetrics(distanceKm);

    return {
      type: BookingType.VEHICLE,
      stayId: null,
      roomId: null,
      roomMaxGuests: null,
      vehicleId: vehicle.id,
      vehicleServiceMode: VehicleServiceMode.RIDE_HAILING,
      pickupAddress,
      dropoffAddress,
      vehicleDistanceKm: tripMetrics.distanceKm,
      vehicleDurationHours: tripMetrics.durationHours,
      vehicleBaseFare: vehicle.baseFare,
      vehiclePricePerKm: vehicle.pricePerKm,
      vehiclePricePerHour: vehicle.pricePerHour,
      attractionId: null,
      slotId: null,
      unitPrice: vehicle.pricePerKm,
    };
  }

  if (
    input.roomId ||
    input.stayId ||
    input.vehicleId ||
    input.vehicleServiceMode ||
    input.pickupAddress ||
    input.dropoffAddress ||
    input.vehicleDistanceKm !== undefined ||
    input.vehicleDurationHours !== undefined
  ) {
    throw new ApiError(
      400,
      "roomId, stayId, vehicleId, vehicleServiceMode, pickupAddress, dropoffAddress, vehicleDistanceKm and vehicleDurationHours are not allowed for attraction booking",
    );
  }

  const attractionId = normalizeId(input.attractionId) ?? normalizeId(booking.attractionId ?? undefined);
  const slotId = normalizeId(input.slotId) ?? normalizeId(booking.slotId ?? undefined);

  if (!attractionId || !slotId) {
    throw new ApiError(400, "attractionId and slotId are required for attraction booking");
  }

  const resolved = await resolveSlotBackedAttractionEntity(db, slotId, attractionId, booking.id);

  return {
    type: BookingType.ATTRACTION,
    stayId: null,
    roomId: null,
    roomMaxGuests: null,
    vehicleId: null,
    vehicleServiceMode: null,
    pickupAddress: null,
    dropoffAddress: null,
    vehicleDistanceKm: null,
    vehicleDurationHours: null,
    vehicleBaseFare: null,
    vehiclePricePerKm: null,
    vehiclePricePerHour: null,
    attractionId: resolved.attraction.id,
    slotId: resolved.slot.id,
    checkIn: resolved.checkIn,
    checkOut: resolved.checkOut,
    unitPrice: resolved.attraction.price,
  };
};

const markBookingCompletedIfDue = async (booking: { id: string; status: BookingStatus; checkOut: Date }) => {
  if (booking.status === BookingStatus.CONFIRMED && isCheckoutPast(booking.checkOut)) {
    return completeBookingIfDue(prisma, booking);
  }

  return false;
};

const assertBookingStatusTransitionAllowed = (currentStatus: BookingStatus, nextStatus: BookingStatus): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (
    (currentStatus === BookingStatus.HOLD || currentStatus === BookingStatus.PENDING) &&
    nextStatus === BookingStatus.CONFIRMED
  ) {
    return;
  }

  if (currentStatus === BookingStatus.PENDING && nextStatus === BookingStatus.HOLD) {
    return;
  }

  throw new ApiError(400, `Invalid booking status transition from ${currentStatus} to ${nextStatus}`);
};

const refreshExpiredHoldState = async (booking: BookingMutationRecord): Promise<BookingMutationRecord> => {
  const expired = await expireBookingHoldIfNeeded(prisma, {
    id: booking.id,
    status: booking.status,
    expiresAt: booking.expiresAt,
  });

  if (!expired) {
    return booking;
  }

  return {
    ...booking,
    status: BookingStatus.EXPIRED,
    expiresAt: null,
  };
};

const ensureBookingCanUpdate = async (booking: BookingMutationRecord) => {
  const currentBooking = await refreshExpiredHoldState(booking);

  if (currentBooking.status === BookingStatus.EXPIRED) {
    throw new ApiError(400, "Expired booking cannot be updated");
  }

  if (currentBooking.status === BookingStatus.CANCELLED) {
    throw new ApiError(400, "Cancelled booking cannot be updated");
  }

  if (currentBooking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, "Completed booking cannot be updated");
  }

  if (isCheckoutPast(currentBooking.checkOut)) {
    await markBookingCompletedIfDue(currentBooking);

    throw new ApiError(400, "Completed booking cannot be updated");
  }
};

const ensureBookingCanCancel = async (booking: BookingMutationRecord) => {
  const currentBooking = await refreshExpiredHoldState(booking);

  const cancelledStatuses: BookingStatus[] = [
    BookingStatus.CANCELLED,
    BookingStatus.CANCELLED_BY_CUSTOMER,
    BookingStatus.CANCELLED_BY_DRIVER,
    BookingStatus.DRIVER_REJECTED,
  ];

  if (cancelledStatuses.includes(currentBooking.status)) {
    throw new ApiError(400, "Booking is already cancelled");
  }

  if (currentBooking.status === BookingStatus.EXPIRED) {
    throw new ApiError(400, "Expired bookings cannot be cancelled");
  }

  if (currentBooking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, "Completed bookings cannot be cancelled");
  }

  if (isCheckoutPast(currentBooking.checkOut)) {
    await markBookingCompletedIfDue(currentBooking);

    throw new ApiError(400, "Completed bookings cannot be cancelled");
  }
};

export const previewBooking = async (payload: PreviewBookingInput) => {
  await expireStaleHoldBookings(prisma);

  const normalizedPayload = normalizeVehicleBookingInput(payload as PreviewBookingInput & BookingEntityInput);

  // Server-side distance calculation to prevent spoofing
  if (normalizedPayload.vehicleId && normalizedPayload.pickupAddress && normalizedPayload.dropoffAddress) {
    const metrics = await calculateTripMetrics(normalizedPayload.pickupAddress, normalizedPayload.dropoffAddress);
    normalizedPayload.vehicleDistanceKm = metrics.distanceKm;
    normalizedPayload.vehicleDurationHours = metrics.durationHours;
  }

  const requestedCheckIn = parseDateOrThrow(normalizedPayload.checkIn, "checkIn");
  const requestedCheckOut = parseDateOrThrow(normalizedPayload.checkOut, "checkOut");

  const entity = await resolveEntityForCreateOrPreview(
    prisma,
    normalizedPayload,
    requestedCheckIn,
    requestedCheckOut,
  );

  const { checkIn, checkOut } = ensureDateRangeOrThrow(
    entity.checkIn ?? requestedCheckIn,
    entity.checkOut ?? requestedCheckOut,
  );

  ensureGuestCountsForBooking(normalizedPayload.guests, entity);

  ensureNoPastDates(checkIn, checkOut);

  const duration = calculateDuration(checkIn, checkOut);
  const totalGuests = sumGuests(normalizedPayload.guests);
  const totalPrice = calculateBasePrice(entity, duration, totalGuests, normalizedPayload.guestDetails);
  const pricing = buildPriceBreakdown(totalPrice, duration);
  const vehicleFare = buildVehicleFareBreakdown(entity);

  return {
    roomId: entity.roomId ?? entity.vehicleId ?? entity.attractionId,
    stayId: entity.stayId,
    vehicleServiceMode: entity.vehicleServiceMode,
    pickupAddress: entity.pickupAddress,
    dropoffAddress: entity.dropoffAddress,
    nights: duration.nights,
    pricePerNight: entity.unitPrice,
    totalPrice,
    bookingType: entity.type,
    slotId: entity.slotId,
    checkIn,
    checkOut,
    basePrice: pricing.basePrice,
    totalNights: pricing.totalNights,
    duration: pricing.duration,
    taxes: pricing.taxes,
    serviceFee: pricing.serviceFee,
    totalAmount: pricing.totalAmount,
    vehicleFare,
  };
};

// Idempotency key must be unique per booking attempt
export const createBooking = async (userId: string, payload: CreateBookingInput, idempotencyKey: string) => {
  const normalizedPayload = normalizeVehicleBookingInput(payload as CreateBookingInput & BookingEntityInput);

  // Server-side distance calculation to prevent spoofing
  if (normalizedPayload.vehicleId && normalizedPayload.pickupAddress && normalizedPayload.dropoffAddress) {
    const metrics = await calculateTripMetrics(normalizedPayload.pickupAddress, normalizedPayload.dropoffAddress);
    normalizedPayload.vehicleDistanceKm = metrics.distanceKm;
    normalizedPayload.vehicleDurationHours = metrics.durationHours;
  }
  const requestedCheckIn = parseDateOrThrow(normalizedPayload.checkIn, "checkIn");
  const requestedCheckOut = parseDateOrThrow(normalizedPayload.checkOut, "checkOut");
  const requestHash = computeBookingRequestHash(normalizedPayload as CreateBookingInput);

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const idempotency = await acquireBookingIdempotency(tx, userId, idempotencyKey, requestHash);

        if (idempotency.replayedResponse) {
          bookingsLogger.info(
            {
              event: "booking_create_replayed",
              userId,
              idempotencyKey,
              bookingId: idempotency.replayedResponse.id,
            },
            "Replayed booking create response",
          );

          return idempotency.replayedResponse;
        }

        const entity = await resolveEntityForCreateOrPreview(
          tx,
          normalizedPayload,
          requestedCheckIn,
          requestedCheckOut,
        );

        const { checkIn, checkOut } = ensureDateRangeOrThrow(
          entity.checkIn ?? requestedCheckIn,
          entity.checkOut ?? requestedCheckOut,
        );

        ensureGuestCountsForBooking(normalizedPayload.guests, entity);

        if (entity.type === BookingType.ATTRACTION && entity.slotId) {
          const totalGuestsToBook = sumGuests(normalizedPayload.guests);
          const attractionSlot = await tx.attractionSlot.findUnique({
            where: { id: entity.slotId },
            select: { id: true, capacity: true }
          });
          if (attractionSlot) {
            const results = await tx.booking.findMany({
              where: {
                slotId: entity.slotId,
                ...buildAvailabilityBlockingBookingWhere(),
              },
              select: { guests: true }
            });
            const alreadyBooked = results.reduce((acc, b) => acc + sumGuests(b.guests), 0);
            if (alreadyBooked + totalGuestsToBook > attractionSlot.capacity) {
              throw new ApiError(409, "Not enough capacity remaining in selected slot");
            }
          }
        }

        ensureNoPastDates(checkIn, checkOut);

        // Prevent owners from booking their own listings (tier farming, fake reviews)
        await ensureUserIsNotListingOwner(tx, userId, entity);

        await ensureNoDuplicateUserBookingIntent(tx, userId, entity, checkIn, checkOut);

        const duration = calculateDuration(checkIn, checkOut);
        const totalGuests = sumGuests(normalizedPayload.guests);
        const totalPrice = calculateBasePrice(entity, duration, totalGuests, normalizedPayload.guestDetails);
        const expiresAt = computeHoldExpiry();

        const booking = await tx.booking.create({
          data: {
            userId,
            stayId: entity.stayId,
            roomId: entity.roomId,
            vehicleId: entity.vehicleId,
            vehicleServiceMode: entity.vehicleServiceMode,
            pickupAddress: entity.pickupAddress,
            dropoffAddress: entity.dropoffAddress,
            vehicleDistanceKm:
              entity.vehicleDistanceKm !== null ? new Prisma.Decimal(entity.vehicleDistanceKm) : null,
            vehicleDurationHours:
              entity.vehicleDurationHours !== null ? new Prisma.Decimal(entity.vehicleDurationHours) : null,
            attractionId: entity.attractionId,
            slotId: entity.slotId,
            type: entity.type,
            checkIn,
            checkOut,
            guests: normalizedPayload.guests as Prisma.InputJsonValue,
            guestDetails: entity.type === BookingType.VEHICLE
              ? { ...(normalizedPayload.guestDetails as object || {}), otp: String(Math.floor(1000 + Math.random() * 9000)) } as Prisma.InputJsonValue
              : normalizedPayload.guestDetails as Prisma.InputJsonValue,
            totalPrice,
            status: entity.type === BookingType.VEHICLE ? BookingStatus.PENDING : BookingStatus.HOLD,
            expiresAt: entity.type === BookingType.VEHICLE ? null : expiresAt,
          },
          select: bookingSelect,
        });

        if (idempotency.idempotencyRecordId) {
          await tx.bookingIdempotency.update({
            where: { id: idempotency.idempotencyRecordId },
            data: {
              status: BookingIdempotencyStatus.SUCCEEDED,
              bookingId: booking.id,
              responseData: toJsonValue(booking),
              errorMessage: null,
            },
          });
        }

        await writeAuditLog(tx, {
          userId,
          action: AuditAction.BOOKING_CREATED,
          entityType: AuditEntityType.BOOKING,
          entityId: booking.id,
          metadata: {
            after: toBookingAuditSnapshot(booking),
            idempotencyKey,
          },
        });

        bookingsLogger.info(
          {
            event: "booking_created",
            bookingId: booking.id,
            userId,
            bookingType: booking.type,
            status: booking.status,
            totalPrice: booking.totalPrice.toString(),
          },
          "Booking created",
        );

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );

    await invalidateAvailabilityCachesForBooking(booking);

    return booking;
  } catch (error) {
    if (error instanceof ApiError) {
      bookingsLogger.warn(
        {
          event: "booking_create_failed",
          userId,
          idempotencyKey,
          statusCode: error.statusCode,
          message: error.message,
        },
        "Booking creation rejected",
      );

      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new ApiError(409, "Selected item is not available for selected dates");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "Duplicate booking request detected");
    }

    // Handle other Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      bookingsLogger.error(
        {
          event: "booking_create_prisma_error",
          userId,
          idempotencyKey,
          prismaCode: error.code,
          message: error.message,
        },
        "Prisma error during booking creation",
      );
      throw new ApiError(500, "Database error during booking creation");
    }

    bookingsLogger.error(
      {
        event: "booking_create_unhandled_error",
        userId,
        idempotencyKey,
        error: serializeError(error),
      },
      "Unhandled booking creation error",
    );

    throw new ApiError(500, "An unexpected error occurred during booking creation");
  }
};

export const getBookingById = async (userId: string, bookingId: string) => {
  const bookingRecord = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingSelect,
  });

  if (!bookingRecord) {
    throw new ApiError(404, "Booking not found");
  }

  if (bookingRecord.userId !== userId) {
    throw new ApiError(403, "You are not allowed to access this booking");
  }

  await expireBookingHoldIfNeeded(prisma, {
    id: bookingRecord.id,
    status: bookingRecord.status,
    expiresAt: bookingRecord.expiresAt,
  });

  const bookingWithRelations = await prisma.booking.findUnique({
    where: { id: bookingRecord.id },
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
      vehicle: {
        include: {
          driver: {
            select: { id: true, name: true, phone: true },
          },
        },
      },
    },
  });

  if (!bookingWithRelations) {
    throw new ApiError(404, "Booking not found");
  }

  return bookingWithRelations as unknown as BookingResponsePayload;
};

export const updateBooking = async (userId: string, bookingId: string, payload: UpdateBookingInput) => {
  const normalizedPayload = normalizeVehicleBookingInput(payload as UpdateBookingInput & BookingEntityInput);

  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: bookingMutationSelect,
  });

  if (!existingBooking) {
    throw new ApiError(404, "Booking not found");
  }

  if (existingBooking.userId !== userId) {
    throw new ApiError(403, "You are not allowed to update this booking");
  }

  await ensureBookingCanUpdate(existingBooking);

  const payloadCheckIn = parseDateOrThrow(normalizedPayload.checkIn, "checkIn");
  const payloadCheckOut = parseDateOrThrow(normalizedPayload.checkOut, "checkOut");

  const nextCheckIn = payloadCheckIn ?? existingBooking.checkIn;
  const nextCheckOut = payloadCheckOut ?? existingBooking.checkOut;

  ensureNoPastDates(nextCheckIn, nextCheckOut);

  const datesChanged =
    nextCheckIn.getTime() !== existingBooking.checkIn.getTime() ||
    nextCheckOut.getTime() !== existingBooking.checkOut.getTime();

  // NOTE: Booking status transitions are NOT allowed via update.
  // HOLD → CONFIRMED only happens through processPayment.
  // HOLD → CANCELLED only happens through cancelBooking.
  // CONFIRMED → COMPLETED only happens through the completion job.

  const booking = await prisma.$transaction(
    async (tx) => {
      // Entity resolution MUST run inside the serializable transaction so that
      // overlap/availability checks are part of the same snapshot as the update.
      const entity = await resolveEntityForUpdate(
        tx,
        existingBooking,
        normalizedPayload,
        nextCheckIn,
        nextCheckOut,
        datesChanged,
      );

      const resolvedCheckIn = entity.checkIn ?? nextCheckIn;
      const resolvedCheckOut = entity.checkOut ?? nextCheckOut;
      const guests = normalizedPayload.guests !== undefined ? normalizedPayload.guests : existingBooking.guests;

      ensureGuestCountsForBooking(guests, entity);

      ensureNoPastDates(resolvedCheckIn, resolvedCheckOut);

      const duration = calculateDuration(resolvedCheckIn, resolvedCheckOut);
      const totalGuests = sumGuests(guests);
      const guestDetails =
        normalizedPayload.guestDetails !== undefined ? normalizedPayload.guestDetails : existingBooking.guestDetails;
      const totalPrice = calculateBasePrice(entity, duration, totalGuests, guestDetails);

      const data: Prisma.BookingUncheckedUpdateInput = {
        roomId: entity.roomId,
        stayId: entity.stayId,
        vehicleId: entity.vehicleId,
        vehicleServiceMode: entity.vehicleServiceMode,
        pickupAddress: entity.pickupAddress,
        dropoffAddress: entity.dropoffAddress,
        vehicleDistanceKm: entity.vehicleDistanceKm !== null ? new Prisma.Decimal(entity.vehicleDistanceKm) : null,
        vehicleDurationHours:
          entity.vehicleDurationHours !== null ? new Prisma.Decimal(entity.vehicleDurationHours) : null,
        attractionId: entity.attractionId,
        slotId: entity.slotId,
        type: entity.type,
        checkIn: resolvedCheckIn,
        checkOut: resolvedCheckOut,
        totalPrice,
      };

      if (normalizedPayload.guests !== undefined) {
        data.guests = normalizedPayload.guests as Prisma.InputJsonValue;
      }

      if (normalizedPayload.guestDetails !== undefined) {
        data.guestDetails = normalizedPayload.guestDetails as Prisma.InputJsonValue;
      }

      const updatedBooking = await tx.booking.update({
        where: { id: existingBooking.id },
        data,
        select: bookingSelect,
      });

      await writeAuditLog(tx, {
        userId,
        action: AuditAction.BOOKING_UPDATED,
        entityType: AuditEntityType.BOOKING,
        entityId: updatedBooking.id,
        metadata: buildBeforeAfterMetadata(
          toBookingAuditSnapshot(existingBooking),
          toBookingAuditSnapshot(updatedBooking),
        ),
      });

      return updatedBooking;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );

  await invalidateAvailabilityCachesForBooking(booking);

  return booking;
};

export const cancelBooking = async (userId: string, bookingId: string, _payload?: CancelBookingInput) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      stay: { select: { ownerId: true } },
      vehicle: { select: { driverId: true } },
    },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  const isCustomer = booking.userId === userId;
  const isStayOwner = booking.stay?.ownerId === userId;
  const isVehicleOwner = booking.vehicle?.driverId === userId;

  if (!isCustomer && !isStayOwner && !isVehicleOwner) {
    throw new ApiError(403, "You are not allowed to cancel this booking");
  }

  // Ride-hailing bookings have their own lifecycle. Delegate to the lifecycle
  // service so the state machine, actor authorization, driver cancel-count
  // increment, and notifications all run consistently. Without this, calling
  // `POST /bookings/:id/cancel` on a ride bypassed the lifecycle entirely
  // and wrote a legacy `CANCELLED` status that the rest of the ride code
  // does not understand.
  if (
    booking.type === BookingType.VEHICLE &&
    booking.vehicleServiceMode === VehicleServiceMode.RIDE_HAILING
  ) {
    if (isCustomer) {
      await rideLifecycle.customerCancelRide(userId, booking.id, _payload?.reason);
    } else if (isVehicleOwner) {
      await rideLifecycle.driverCancelRide(userId, booking.id, _payload?.reason);
    } else {
      // Stay owners cannot cancel ride bookings (defensive — checked above).
      throw new ApiError(403, "You are not allowed to cancel this ride");
    }

    const refreshed = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: bookingSelect,
    });

    if (!refreshed) {
      throw new ApiError(404, "Booking not found");
    }

    return refreshed;
  }

  await ensureBookingCanCancel(booking);

  const cancelledBooking = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        expiresAt: null,
        cancelReason: _payload?.reason || "Cancelled by user",
        cancelledBy: isCustomer ? "customer" : isStayOwner ? "owner" : isVehicleOwner ? "driver" : "system",
      },
      select: bookingSelect,
    });

    await writeAuditLog(tx, {
      userId,
      action: AuditAction.BOOKING_CANCELLED,
      entityType: AuditEntityType.BOOKING,
      entityId: updatedBooking.id,
      metadata: buildBeforeAfterMetadata(
        toBookingAuditSnapshot(booking),
        toBookingAuditSnapshot(updatedBooking),
      ),
    });

    return updatedBooking;
  });

  await invalidateAvailabilityCachesForBooking(cancelledBooking);

  return cancelledBooking;
};

export const approveBooking = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      stay: { select: { ownerId: true } },
    },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.stay?.ownerId !== userId) {
    throw new ApiError(403, "You are not the owner of this property");
  }

  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.HOLD) {
    throw new ApiError(400, `Cannot approve a booking in ${booking.status} state`);
  }

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        expiresAt: null,
      },
      select: bookingSelect,
    });

    await writeAuditLog(tx, {
      userId,
      action: AuditAction.BOOKING_STATUS_CHANGED,
      entityType: AuditEntityType.BOOKING,
      entityId: updated.id,
      metadata: {
        before: booking.status,
        after: BookingStatus.CONFIRMED,
      },
    });

    return updated;
  });

  await invalidateAvailabilityCachesForBooking(updatedBooking);

  return updatedBooking;
};

// NOTE: Ride-hailing lifecycle (acceptRide, declineRide, markDriverArrived,
// startTrip, completeTrip, customerCancelRide, driverCancelRide,
// customerConfirmCompletion, customerMarkRidePaid, customerReportIssue,
// markRidePaid, markRideCompleted, expirePendingRideRequests, etc.) lives
// EXCLUSIVELY in `services/ride-lifecycle.service.ts` and is exposed to
// controllers via `services/rides.service.ts`.
//
// Do NOT reintroduce ride status mutations here — every ride.status change
// must flow through the lifecycle state machine. The generic `cancelBooking`
// above detects ride bookings and forwards to the lifecycle service so this
// rule is enforced even for the legacy `POST /bookings/:id/cancel` endpoint.

export const getUserBookings = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
) => {
  await expireStaleHoldBookings(prisma);

  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        ...bookingSelect,
        stay: {
          select: {
            id: true,
            title: true,
            city: true,
            images: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            images: true,
            driver: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    bookings,
  };
};

export const getOwnerBookings = async (
  ownerId: string,
  pagination?: { page?: number; limit?: number },
) => {
  await expireStaleHoldBookings(prisma);

  const { page, limit, skip, take } = parsePagination(pagination);

  const where = {
    OR: [
      { stay: { ownerId } },
      { vehicle: { driverId: ownerId } },
    ],
  } satisfies Prisma.BookingWhereInput;

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        ...bookingSelect,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stay: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const safeBookings = bookings.map((b) => {
    // SECURITY: Strip OTP from guestDetails before returning to the owner/driver.
    // The OTP is for the customer only — drivers must receive it verbally from them.
    const guestDetailsObj =
      b.guestDetails && typeof b.guestDetails === "object" && !Array.isArray(b.guestDetails)
        ? (b.guestDetails as Record<string, unknown>)
        : {};
    const { otp: _otp, ...safeGuestDetails } = guestDetailsObj;

    return {
      ...b,
      guestDetails: safeGuestDetails as Prisma.JsonValue,
      guest: {
        name: b.user?.name ?? "Guest",
        email: b.user?.email ?? "",
      },
      totalAmount: b.totalPrice,
    };
  });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    bookings: safeBookings,
  };
};


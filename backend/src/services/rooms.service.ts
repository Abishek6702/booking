import { ListingModerationStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { CreateRoomInput, UpdateRoomInput } from "../schemas/rooms.schema";
import { ApiError } from "../utils/error.util";

const roomSelect = {
  id: true,
  stayId: true,
  name: true,
  pricePerNight: true,
  maxGuests: true,
  bedType: true,
  amenities: true,
  options: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomSelect;

// Helper function removed in favor of direct check in getStayRooms

const ensureOwnerOwnsStay = async (ownerId: string, stayId: string) => {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found");
  }

  if (stay.ownerId !== ownerId) {
    throw new ApiError(403, "You are not allowed to manage rooms for this stay");
  }
};

const ensureRoomBelongsToStay = async (stayId: string, roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      stayId: true,
    },
  });

  if (!room || room.stayId !== stayId) {
    throw new ApiError(404, "Room not found for this stay");
  }
};

const ensureStayExists = async (stayId: string) => {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    select: { id: true },
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found");
  }
};

export const getStayRooms = async (stayId: string, viewerId?: string) => {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    select: { id: true, ownerId: true, moderationStatus: true },
  });

  if (!stay) {
    throw new ApiError(404, "Stay not found");
  }

  if (stay.ownerId !== viewerId && stay.moderationStatus !== ListingModerationStatus.APPROVED) {
    throw new ApiError(404, "Stay not found");
  }

  // Hard cap to prevent unbounded payloads. A single stay should never have
  // more than ~100 rooms in practice; if a property genuinely has more we
  // would split into a paginated endpoint.
  const rooms = await prisma.room.findMany({
    where: { stayId },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: roomSelect,
  });

  return rooms;
};

export const getRoom = async (stayId: string, roomId: string) => {
  await ensureStayExists(stayId);
  await ensureRoomBelongsToStay(stayId, roomId);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: roomSelect,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  return room;
};

export const getRoomAvailability = async (stayId: string, roomId: string, query: import("../schemas/rooms.schema").RoomAvailabilityQueryInput) => {
  await ensureStayExists(stayId);
  await ensureRoomBelongsToStay(stayId, roomId);

  const startDate = new Date(query.start);
  const endDate = new Date(query.end);

  const overlappingBookings = await prisma.booking.count({
    where: {
      roomId,
      status: {
        in: ["CONFIRMED", "PENDING", "HOLD"],
      },
      OR: [
        {
          checkIn: { lte: endDate },
          checkOut: { gte: startDate },
        },
      ],
    },
  });

  return {
    isAvailable: overlappingBookings === 0,
    overlappingBookings,
  };
};

export const createRoom = async (ownerId: string, stayId: string, payload: CreateRoomInput) => {
  await ensureOwnerOwnsStay(ownerId, stayId);

  const room = await prisma.room.create({
    data: {
      stayId,
      name: payload.name,
      pricePerNight: new Prisma.Decimal(payload.pricePerNight),
      maxGuests: payload.maxGuests,
      bedType: payload.bedType,
      amenities: payload.amenities ?? [],
      options: payload.options ?? Prisma.JsonNull,
    },
    select: roomSelect,
  });

  return room;
};

export const updateRoom = async (
  ownerId: string,
  stayId: string,
  roomId: string,
  payload: UpdateRoomInput,
) => {
  await ensureOwnerOwnsStay(ownerId, stayId);
  await ensureRoomBelongsToStay(stayId, roomId);

  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: payload.name,
      pricePerNight: new Prisma.Decimal(payload.pricePerNight),
      maxGuests: payload.maxGuests,
      bedType: payload.bedType,
      ...(payload.amenities !== undefined
        ? {
            amenities: payload.amenities,
          }
        : {}),
      ...(payload.options !== undefined
        ? {
            options: payload.options ?? Prisma.JsonNull,
          }
        : {}),
    },
    select: roomSelect,
  });

  return room;
};

export const deleteRoom = async (ownerId: string, stayId: string, roomId: string) => {
  await ensureOwnerOwnsStay(ownerId, stayId);
  await ensureRoomBelongsToStay(stayId, roomId);

  await prisma.room.delete({
    where: { id: roomId },
  });

  return {};
};

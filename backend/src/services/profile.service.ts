import { DriverStatus, ItemType, Prisma } from "@prisma/client";
import * as reviewsService from "./reviews.service";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { parsePagination } from "../utils/pagination.util";
import {
  ProfileBookingsQueryInput,
  ToggleFavoriteInput,
  UpdateProfileInput,
} from "../schemas/profile.schema";

const profileUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
  driverStatus: true,
  membershipTier: true,
  lifetimeSpend: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

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
  type: true,
  checkIn: true,
  checkOut: true,
  guests: true,
  guestDetails: true,
  totalPrice: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  stay: {
    select: {
      id: true,
      title: true,
      images: true,
      city: true,
    }
  },
  vehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
    }
  }
} satisfies Prisma.BookingSelect;

const favoriteSelect = {
  id: true,
  userId: true,
  itemId: true,
  itemType: true,
  createdAt: true,
} satisfies Prisma.FavoriteSelect;

const mapItemType = (itemType: ToggleFavoriteInput["itemType"]): ItemType => {
  if (itemType === "stay") {
    return ItemType.STAY;
  }

  if (itemType === "vehicle") {
    return ItemType.VEHICLE;
  }

  return ItemType.ATTRACTION;
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileUserSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const updateProfile = async (userId: string, payload: UpdateProfileInput) => {
  const data: Prisma.UserUpdateInput = {};

  if (payload.name !== undefined) {
    data.name = payload.name;
  }

  if (payload.phone !== undefined) {
    data.phone = payload.phone;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: profileUserSelect,
  });

  return updatedUser;
};

export const updateAvatar = async (userId: string, payload: import("../schemas/profile.schema").UpdateAvatarInput) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: payload.avatarUrl },
    select: profileUserSelect,
  });

  return updatedUser;
};

export const getMyBookings = async (userId: string, pagination: ProfileBookingsQueryInput) => {
  const page = pagination.page;
  const limit = pagination.limit;
  const skip = (page - 1) * limit;

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({
      where: { userId },
    }),
    prisma.booking.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: bookingSelect,
    }),
  ]);

  // Normalize for frontend
  const normalizedBookings = bookings.map((b: any) => ({
    ...b,
    totalAmount: Number(b.totalPrice),
    stay: b.stay ? {
      ...b.stay,
      name: b.stay.title, // Alias title to name
    } : null,
    vehicle: b.vehicle ? {
      ...b.vehicle,
      name: `${b.vehicle.brand} ${b.vehicle.model}`, // Construct name
    } : null,
  }));

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    bookings: normalizedBookings,
  };
};

export const toggleFavorite = async (userId: string, payload: ToggleFavoriteInput) => {
  const itemType = mapItemType(payload.itemType);

  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_itemId_itemType: {
        userId,
        itemId: payload.itemId,
        itemType,
      },
    },
    select: favoriteSelect,
  });

  if (existingFavorite) {
    await prisma.favorite.delete({
      where: {
        id: existingFavorite.id,
      },
    });

    return {
      action: "removed",
      favorite: existingFavorite,
    };
  }

  const favorite = await prisma.favorite.create({
    data: {
      userId,
      itemId: payload.itemId,
      itemType,
    },
    select: favoriteSelect,
  });

  return {
    action: "added",
    favorite,
  };
};

export const getMyFavorites = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, favorites] = await prisma.$transaction([
    prisma.favorite.count({ where: { userId } }),
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        itemId: true,
        itemType: true,
      },
    }),
  ]);

  const stayIds = favorites
    .filter((f) => f.itemType === ItemType.STAY)
    .map((f) => f.itemId);

  const attractionIds = favorites
    .filter((f) => f.itemType === ItemType.ATTRACTION)
    .map((f) => f.itemId);

  const stays = stayIds.length === 0
    ? []
    : await prisma.stay.findMany({
        where: { id: { in: stayIds } },
        select: {
          id: true,
          title: true,
          images: true,
          city: true,
          country: true,
          type: true,
          avgRating: true,
          totalReviews: true,
          rooms: {
            select: { pricePerNight: true },
            take: 1,
            orderBy: { pricePerNight: "asc" },
          },
        },
      });

  const attractions = attractionIds.length === 0
    ? []
    : await prisma.attraction.findMany({
        where: { id: { in: attractionIds } },
        select: {
          id: true,
          title: true,
          images: true,
          location: true,
          price: true,
          type: true,
        },
      });

  const enriched = favorites
    .map((f) => {
      if (f.itemType === ItemType.STAY) {
        const stay = stays.find((s) => s.id === f.itemId);
        if (!stay) return null;
        return {
          id: stay.id,
          title: stay.title,
          name: stay.title, // Alias
          image: stay.images[0],
          location: `${stay.city}, ${stay.country}`,
          price: Number(stay.rooms[0]?.pricePerNight || 0),
          rating: Number(stay.avgRating),
          reviews: stay.totalReviews,
          type: stay.type,
        };
      }
      if (f.itemType === ItemType.ATTRACTION) {
        const attraction = attractions.find((a) => a.id === f.itemId);
        if (!attraction) return null;
        
        let locString = "Unknown Location";
        if (attraction.location && typeof attraction.location === 'object') {
          const loc = attraction.location as any;
          locString = loc.city && loc.country ? `${loc.city}, ${loc.country}` : String(attraction.location);
        } else if (typeof attraction.location === 'string') {
          locString = attraction.location;
        }

        return {
          id: attraction.id,
          title: attraction.title,
          name: attraction.title,
          image: attraction.images[0],
          location: locString,
          price: Number(attraction.price || 0),
          rating: 4.8, // Mocked rating since attractions don't have avgRating yet
          reviews: 120,
          type: "attraction", 
        };
      }
      return null; // Handle others later
    })
    .filter(Boolean);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    favorites: enriched,
  };
};

export const getMyReviews = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
) => {
  return reviewsService.getUserReviews(userId, pagination);
};

export const deleteAccount = async (userId: string) => {
  await prisma.user.delete({
    where: { id: userId },
  });
};

export const applyAsDriver = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      driverStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.driverStatus === DriverStatus.APPROVED) {
    throw new ApiError(400, "Driver is already approved");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      driverStatus: DriverStatus.PENDING,
    },
    select: profileUserSelect,
  });
};

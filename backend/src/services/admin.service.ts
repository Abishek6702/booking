import {
  AuditAction,
  AuditEntityType,
  AccountReviewStatus,
  BookingStatus,
  DriverStatus,
  ItemType,
  ListingModerationStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "../config/prisma";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { ApiError } from "../utils/error.util";
import { invalidateCacheByPrefixes } from "../utils/cache.util";
import {
  buildStayAvailabilityCachePrefix,
  buildStayDetailCacheKey,
  STAYS_SEARCH_CACHE_PREFIX,
  buildVehicleDetailCacheKey,
  buildVehicleAvailabilityCachePrefix,
  VEHICLES_SEARCH_CACHE_PREFIX,
} from "../utils/cache-keys.util";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const listUsersQuerySchema = paginationSchema.extend({
  role: z.enum(["customer", "owner", "driver", "admin"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

const listListingsQuerySchema = paginationSchema.extend({
  ownerId: z.string().trim().min(1).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  search: z.string().trim().min(1).optional(),
});

const listStaysQuerySchema = listListingsQuerySchema;
const listVehiclesQuerySchema = paginationSchema.extend({
  ownerId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  search: z.string().trim().min(1).optional(),
});
const listAttractionsQuerySchema = listListingsQuerySchema;

const listBookingsQuerySchema = paginationSchema.extend({
  status: z.enum(["hold", "pending", "confirmed", "cancelled", "expired", "completed"]).optional(),
});

const listReviewsQuerySchema = paginationSchema.extend({
  userId: z.string().trim().min(1).optional(),
  itemId: z.string().trim().min(1).optional(),
  itemType: z.enum(["stay", "vehicle", "attraction"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

const listPendingOwnersQuerySchema = paginationSchema;

const roleUpdateSchema = z.object({
  role: z.enum(["customer", "owner", "admin"]),
});

const rejectionReasonSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

const mapUserRole = (role: "customer" | "owner" | "driver" | "admin"): UserRole => {
  if (role === "admin") {
    return UserRole.ADMIN;
  }

  if (role === "owner") {
    return UserRole.OWNER;
  }

  // Drivers are customers with an approved driverStatus
  return UserRole.CUSTOMER;
};

const mapItemType = (itemType: "stay" | "vehicle" | "attraction"): ItemType => {
  if (itemType === "vehicle") {
    return ItemType.VEHICLE;
  }

  if (itemType === "attraction") {
    return ItemType.ATTRACTION;
  }

  return ItemType.STAY;
};

const mapBookingStatus = (
  status: "hold" | "pending" | "confirmed" | "cancelled" | "expired" | "completed",
) => {
  if (status === "hold") {
    return BookingStatus.HOLD;
  }

  if (status === "expired") {
    return BookingStatus.EXPIRED;
  }

  if (status === "completed") {
    return BookingStatus.COMPLETED;
  }

  if (status === "confirmed") {
    return BookingStatus.CONFIRMED;
  }

  if (status === "cancelled") {
    return BookingStatus.CANCELLED;
  }

  return BookingStatus.PENDING;
};

const mapModerationStatus = (status: "pending" | "approved" | "rejected") => {
  if (status === "approved") {
    return ListingModerationStatus.APPROVED;
  }

  if (status === "rejected") {
    return ListingModerationStatus.REJECTED;
  }

  return ListingModerationStatus.PENDING;
};

const ensureId = (id: string, message: string): string => {
  const value = id.trim();
  if (!value) {
    throw new ApiError(400, message);
  }

  return value;
};

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isVerified: true,
  phone: true,
  ownerStatus: true,
  driverStatus: true,
  documents: true,
  membershipTier: true,
  lifetimeSpend: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userDetailsSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isVerified: true,
  membershipTier: true,
  lifetimeSpend: true,
  ownerStatus: true,
  driverStatus: true,
  documents: true,
  createdAt: true,
  bookings: {
    take: 1,
    orderBy: { createdAt: "desc" },
    select: { guestDetails: true },
  },
  _count: {
    select: {
      ownedStays: true,
      vehicles: true,
      bookings: true,
      reviews: true,
    },
  },
} satisfies Prisma.UserSelect;

const stayListSelect = {
  id: true,
  ownerId: true,
  title: true,
  type: true,
  city: true,
  country: true,
  images: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.StaySelect;

const vehicleListSelect = {
  id: true,
  driverId: true,
  type: true,
  brand: true,
  model: true,
  seats: true,
  pricePerKm: true,
  images: true,
  isActive: true,
  moderationStatus: true,
  moderationReason: true,
  description: true,
  baseFare: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,
  driver: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.VehicleSelect;


const bookingListSelect = {
  id: true,
  status: true,
  totalPrice: true,
  checkIn: true,
  checkOut: true,
  type: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  stay: {
    select: {
      id: true,
      ownerId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingSelect;

const reviewListSelect = {
  id: true,
  userId: true,
  itemId: true,
  itemType: true,
  rating: true,
  createdAt: true,
} satisfies Prisma.ReviewSelect;

const pendingOwnerSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isVerified: true,
  ownerStatus: true,
  documents: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const ticketListSelect = {
  id: true,
  userId: true,
  subject: true,
  message: true,
  attachments: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.TicketSelect;

const paymentListSelect = {
  id: true,
  bookingId: true,
  userId: true,
  amount: true,
  currency: true,
  status: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

export const listUsers = async (queryInput: unknown) => {
  const query = listUsersQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    if (query.role === "driver") {
      where.driverStatus = { in: [AccountReviewStatus.APPROVED, AccountReviewStatus.PENDING] };
    } else if (query.role === "customer") {
      where.role = UserRole.CUSTOMER;
      where.driverStatus = AccountReviewStatus.REJECTED;
    } else {
      where.role = mapUserRole(query.role);
    }
  }

  if (query.search) {
    where.OR = [
      {
        email: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: userListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    users: users.map(u => ({
      ...u,
      role: query.role ? query.role.toUpperCase() : (u.role === UserRole.CUSTOMER && u.driverStatus !== AccountReviewStatus.REJECTED) ? "DRIVER" : u.role
    })),
  };
};

export const getUserDetails = async (userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
    select: userDetailsSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    ...user,
    role: (user.role === UserRole.CUSTOMER && user.driverStatus !== AccountReviewStatus.REJECTED) ? "DRIVER" : user.role
  };
};

export const updateUserRole = async (adminId: string, userId: string, input: unknown) => {
  const payload = roleUpdateSchema.parse(input);
  const nextRole = mapUserRole(payload.role);

  if (nextRole === UserRole.ADMIN) {
    const superAdminId = process.env.SUPER_ADMIN_ID;
    if (!superAdminId || adminId !== superAdminId) {
      throw new ApiError(403, "Only the Super Admin can assign the ADMIN role");
    }
  }

  const id = ensureId(userId, "Invalid user id");

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (existingUser.id === adminId && nextRole !== UserRole.ADMIN) {
    throw new ApiError(400, "Admin cannot remove their own admin role");
  }

  if (existingUser.role === UserRole.ADMIN && nextRole !== UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: {
        role: UserRole.ADMIN,
      },
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot remove role from the last admin");
    }
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        role: nextRole,
      },
      select: userListSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.USER_ROLE_UPDATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      metadata: buildBeforeAfterMetadata(
        {
          role: existingUser.role,
        },
        {
          role: user.role,
        },
      ),
    });

    return user;
  });
};

export const listStays = async (queryInput: unknown) => {
  const query = listStaysQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.StayWhereInput = {
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.status ? { moderationStatus: mapModerationStatus(query.status) } : {}),
  };

  if (query.search) {
    where.OR = [
      {
        title: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        city: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [total, stays] = await prisma.$transaction([
    prisma.stay.count({ where }),
    prisma.stay.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: stayListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    stays,
  };
};

export const approveStay = async (adminId: string, stayId: string) => {
  const id = ensureId(stayId, "Invalid stay id");

  const existingStay = await prisma.stay.findUnique({
    where: { id },
    select: stayListSelect,
  });

  if (!existingStay) {
    throw new ApiError(404, "Stay not found");
  }

  if (existingStay.moderationStatus === ListingModerationStatus.APPROVED) {
    throw new ApiError(400, "Stay is already approved");
  }

  const stay = await prisma.$transaction(async (tx) => {
    const updated = await tx.stay.update({
      where: { id },
      data: {
        moderationStatus: ListingModerationStatus.APPROVED,
        moderationReason: null,
        moderatedAt: new Date(),
      },
      select: stayListSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_APPROVED,
      entityType: AuditEntityType.STAY,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          moderationStatus: existingStay.moderationStatus,
          moderationReason: existingStay.moderationReason,
        },
        {
          moderationStatus: updated.moderationStatus,
          moderationReason: updated.moderationReason,
        },
      ),
    });

    return updated;
  });

  await invalidateCacheByPrefixes([
    STAYS_SEARCH_CACHE_PREFIX,
    buildStayDetailCacheKey(stayId),
    buildStayAvailabilityCachePrefix(stayId),
  ]);

  return stay;
};

export const rejectStay = async (adminId: string, stayId: string, input: unknown) => {
  const id = ensureId(stayId, "Invalid stay id");
  const payload = rejectionReasonSchema.parse(input);

  const existingStay = await prisma.stay.findUnique({
    where: { id },
    select: stayListSelect,
  });

  if (!existingStay) {
    throw new ApiError(404, "Stay not found");
  }

  if (existingStay.moderationStatus === ListingModerationStatus.REJECTED) {
    throw new ApiError(400, "Stay is already rejected");
  }

  const stay = await prisma.$transaction(async (tx) => {
    const updated = await tx.stay.update({
      where: { id },
      data: {
        moderationStatus: ListingModerationStatus.REJECTED,
        moderationReason: payload.reason ?? null,
        moderatedAt: new Date(),
      },
      select: stayListSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_REJECTED,
      entityType: AuditEntityType.STAY,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          moderationStatus: existingStay.moderationStatus,
          moderationReason: existingStay.moderationReason,
        },
        {
          moderationStatus: updated.moderationStatus,
          moderationReason: updated.moderationReason,
        },
      ),
    });

    return updated;
  });

  await invalidateCacheByPrefixes([
    STAYS_SEARCH_CACHE_PREFIX,
    buildStayDetailCacheKey(stayId),
    buildStayAvailabilityCachePrefix(stayId),
  ]);

  return stay;
};

export const listVehicles = async (queryInput: unknown) => {
  const query = listVehiclesQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;
  const driverId = query.driverId ?? query.ownerId;

  const where: Prisma.VehicleWhereInput = {
    ...(driverId ? { driverId } : {}),
    ...(query.status ? { moderationStatus: mapModerationStatus(query.status) } : {}),
  };

  if (query.search) {
    where.OR = [
      {
        brand: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        model: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [total, vehicles] = await prisma.$transaction([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: vehicleListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    vehicles,
  };
};

export const approveVehicle = async (adminId: string, vehicleId: string) => {
  const id = ensureId(vehicleId, "Invalid vehicle id");

  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: vehicleListSelect,
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  const vehicle = await prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({
      where: { id },
      data: {
        moderationStatus: ListingModerationStatus.APPROVED,
        moderationReason: null,
        moderatedAt: new Date(),
        isActive: true,
      },
      select: vehicleListSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_APPROVED,
      entityType: AuditEntityType.VEHICLE,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          moderationStatus: existingVehicle.moderationStatus,
          moderationReason: existingVehicle.moderationReason,
        },
        {
          moderationStatus: updated.moderationStatus,
          moderationReason: updated.moderationReason,
        },
      ),
    });

    return updated;
  });

  await invalidateCacheByPrefixes([
    VEHICLES_SEARCH_CACHE_PREFIX,
    buildVehicleDetailCacheKey(vehicleId),
    buildVehicleAvailabilityCachePrefix(vehicleId),
  ]);

  return vehicle;
};

export const rejectVehicle = async (adminId: string, vehicleId: string, input: unknown) => {
  const id = ensureId(vehicleId, "Invalid vehicle id");
  const payload = rejectionReasonSchema.parse(input);

  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: vehicleListSelect,
  });

  if (!existingVehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  const vehicle = await prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({
      where: { id },
      data: {
        moderationStatus: ListingModerationStatus.REJECTED,
        moderationReason: payload.reason ?? null,
        moderatedAt: new Date(),
      },
      select: vehicleListSelect,
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.LISTING_REJECTED,
      entityType: AuditEntityType.VEHICLE,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          moderationStatus: existingVehicle.moderationStatus,
          moderationReason: existingVehicle.moderationReason,
        },
        {
          moderationStatus: updated.moderationStatus,
          moderationReason: updated.moderationReason,
        },
      ),
    });

    return updated;
  });

  await invalidateCacheByPrefixes([
    VEHICLES_SEARCH_CACHE_PREFIX,
    buildVehicleDetailCacheKey(vehicleId),
    buildVehicleAvailabilityCachePrefix(vehicleId),
  ]);

  return vehicle;
};


export const listBookings = async (queryInput: unknown) => {
  const query = listBookingsQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.BookingWhereInput = {};

  if (query.status) {
    where.status = mapBookingStatus(query.status);
  }

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: bookingListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    bookings: bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      totalPrice: booking.totalPrice,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      type: booking.type,
      createdAt: booking.createdAt,
      user: booking.user,
      stay: booking.stay,
    })),
  };
};

export const listReviews = async (queryInput: unknown) => {
  const query = listReviewsQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.ReviewWhereInput = {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.itemType ? { itemType: mapItemType(query.itemType) } : {}),
    ...(query.rating !== undefined ? { rating: query.rating } : {}),
  };

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: reviewListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    reviews,
  };
};

export const listPendingOwners = async (queryInput: unknown) => {
  const query = listPendingOwnersQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.UserWhereInput = {
    role: UserRole.OWNER,
    ownerStatus: AccountReviewStatus.PENDING,
  };

  const [total, owners] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        updatedAt: "asc",
      },
      select: pendingOwnerSelect, /* test */
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    owners,
  };
};

export const approveOwnerVerification = async (adminId: string, ownerUserId: string) => {
  const id = ensureId(ownerUserId, "Invalid owner id");

  const owner = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      ownerStatus: true,
    },
  });

  if (!owner) {
    throw new ApiError(404, "Owner not found");
  }

  if (owner.role !== UserRole.OWNER) {
    throw new ApiError(400, "Target user is not an owner");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ownerStatus: AccountReviewStatus.APPROVED,
      },
      select: pendingOwnerSelect,
    });

    await tx.stay.updateMany({
      where: { ownerId: id },
      data: {
        moderationStatus: ListingModerationStatus.APPROVED,
        moderatedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.OWNER_VERIFICATION_APPROVED,
      entityType: AuditEntityType.OWNER_VERIFICATION,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          ownerStatus: owner.ownerStatus,
        },
        {
          ownerStatus: updated.ownerStatus,
        },
      ),
    });

    return updated;
  });
};

export const rejectOwnerVerification = async (adminId: string, ownerUserId: string) => {
  const id = ensureId(ownerUserId, "Invalid owner id");

  const owner = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      ownerStatus: true,
    },
  });

  if (!owner) {
    throw new ApiError(404, "Owner not found");
  }

  if (owner.role !== UserRole.OWNER) {
    throw new ApiError(400, "Target user is not an owner");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ownerStatus: AccountReviewStatus.REJECTED,
      },
      select: pendingOwnerSelect, /* test */
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.OWNER_VERIFICATION_REJECTED,
      entityType: AuditEntityType.OWNER_VERIFICATION,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        {
          ownerStatus: owner.ownerStatus,
        },
        {
          ownerStatus: updated.ownerStatus,
        },
      ),
    });

    return updated;
  });
};

export const deleteUser = async (userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await prisma.user.delete({
    where: { id },
  });

  return {};
};

export const deleteReview = async (reviewId: string) => {
  const id = ensureId(reviewId, "Invalid review id");

  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  await prisma.review.delete({
    where: { id },
  });

  return {};
};

export const listSupportTickets = async (queryInput: unknown) => {
  const query = paginationSchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const [total, tickets] = await prisma.$transaction([
    prisma.ticket.count(),
    prisma.ticket.findMany({
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: ticketListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    tickets,
  };
};

export const listPayments = async (queryInput: unknown) => {
  const query = paginationSchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count(),
    prisma.payment.findMany({
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: paymentListSelect,
    }),
  ]);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    payments,
  };
};

export const getStats = async () => {
  const [
    totalUsers,
    totalBookings,
    totalStays,
    pendingStays,
    totalVehicles,
    pendingVehicles,
    totalAttractions,
    pendingOwners,
    pendingDrivers,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.stay.count(),
    prisma.stay.count({ where: { moderationStatus: "PENDING" } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { moderationStatus: "PENDING" } }),
    prisma.attraction.count(),
    prisma.user.count({ where: { role: UserRole.OWNER, ownerStatus: "PENDING" } }),
    prisma.user.count({ where: { driverStatus: "PENDING" } }),
  ]);

  const totalRevenueResult = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS" },
  });

  return {
    totalUsers,
    totalBookings,
    totalRevenue: totalRevenueResult._sum.amount || 0,
    listings: {
      stays: totalStays,
      pendingStays,
      vehicles: totalVehicles,
      pendingVehicles,
      attractions: totalAttractions,
    },
    pendingOwners,
    pendingDrivers,
  };
};

export const approveOwner = async (adminId: string, userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      ownerStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== UserRole.OWNER) {
    throw new ApiError(400, "User is not an owner");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ownerStatus: AccountReviewStatus.APPROVED,
        isVerified: true,
      },
      select: userDetailsSelect,
    });

    await tx.stay.updateMany({
      where: { ownerId: id },
      data: {
        moderationStatus: ListingModerationStatus.APPROVED,
        moderatedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.OWNER_VERIFICATION_APPROVED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        { ownerStatus: user.ownerStatus },
        { ownerStatus: updated.ownerStatus },
      ),
    });

    return updated;
  });
};

export const approveDriver = async (adminId: string, userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        driverStatus: DriverStatus.APPROVED,
        isVerified: true,
      },
      select: userDetailsSelect,
    });

    await tx.vehicle.updateMany({
      where: { driverId: id },
      data: {
        moderationStatus: ListingModerationStatus.APPROVED,
        moderatedAt: new Date(),
      },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.USER_ROLE_UPDATED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        { driverStatus: user.driverStatus },
        { driverStatus: updated.driverStatus },
      ),
    });

    return updated;
  });
};
export const rejectOwner = async (adminId: string, userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      ownerStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.ownerStatus === AccountReviewStatus.REJECTED) {
    throw new ApiError(400, "Owner is already rejected");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ownerStatus: AccountReviewStatus.REJECTED,
      },
      select: userDetailsSelect,
    });

    await tx.stay.updateMany({
      where: { ownerId: id },
      data: {
        moderationStatus: ListingModerationStatus.REJECTED,
        moderatedAt: new Date(),
        moderationReason: "Owner account was rejected by admin",
      },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.OWNER_VERIFICATION_REJECTED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        { ownerStatus: user.ownerStatus },
        { ownerStatus: updated.ownerStatus },
      ),
    });

    return updated;
  });
};

export const rejectDriver = async (adminId: string, userId: string) => {
  const id = ensureId(userId, "Invalid user id");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      driverStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.driverStatus === DriverStatus.REJECTED) {
    throw new ApiError(400, "Driver is already rejected");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        driverStatus: DriverStatus.REJECTED,
      },
      select: userDetailsSelect,
    });

    await tx.vehicle.updateMany({
      where: { driverId: id },
      data: {
        moderationStatus: ListingModerationStatus.REJECTED,
        moderatedAt: new Date(),
        moderationReason: "Driver account was rejected by admin",
      },
    });

    await writeAuditLog(tx, {
      userId: adminId,
      action: AuditAction.USER_ROLE_UPDATED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      metadata: buildBeforeAfterMetadata(
        { driverStatus: user.driverStatus },
        { driverStatus: updated.driverStatus },
      ),
    });

    return updated;
  });
};
export const listPendingDrivers = async (queryInput: unknown) => {
  const query = listPendingOwnersQuerySchema.parse(queryInput);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.UserWhereInput = {
    driverStatus: DriverStatus.PENDING,
  };

  const [total, drivers] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        updatedAt: "asc",
      },
      select: userDetailsSelect,
    }),
  ]);

  return {
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
    drivers,
  };
};

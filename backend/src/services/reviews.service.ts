import { BookingStatus, BookingType, ItemType, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { CreateReviewInput, GetReviewsQueryInput, UpdateReviewInput } from "../schemas/reviews.schema";
import { ApiError } from "../utils/error.util";
import { parsePagination } from "../utils/pagination.util";
import { recalculateListingRating } from "./rating-aggregation.service";

const reviewSelect = {
  id: true,
  userId: true,
  bookingId: true,
  itemId: true,
  itemType: true,
  rating: true,
  title: true,
  comment: true,
  ownerReply: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      name: true,
    }
  }
} satisfies Prisma.ReviewSelect;

const mapItemType = (itemType: "stay" | "vehicle" | "attraction"): ItemType => {
  if (itemType === "stay") {
    return ItemType.STAY;
  }

  if (itemType === "vehicle") {
    return ItemType.VEHICLE;
  }

  return ItemType.ATTRACTION;
};

const resolveBookingItem = (booking: {
  type: BookingType;
  stayId: string | null;
  vehicleId: string | null;
  attractionId: string | null;
}) => {
  if (booking.type === BookingType.STAY) {
    return {
      itemType: ItemType.STAY,
      itemId: booking.stayId,
    };
  }

  if (booking.type === BookingType.VEHICLE) {
    return {
      itemType: ItemType.VEHICLE,
      itemId: booking.vehicleId,
    };
  }

  return {
    itemType: ItemType.ATTRACTION,
    itemId: booking.attractionId,
  };
};

export const createReview = async (userId: string, payload: CreateReviewInput) => {
  return prisma.$transaction(async (tx) => {
    const bookingRecord = await tx.booking.findUnique({
      where: { id: payload.bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        type: true,
        stayId: true,
        vehicleId: true,
        attractionId: true,
        checkOut: true,
      },
    });

    if (!bookingRecord) {
      throw new ApiError(404, "Booking not found");
    }

    const booking = bookingRecord;

    if (booking.userId !== userId) {
      throw new ApiError(403, "You are not allowed to review this booking");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ApiError(400, "Cancelled booking cannot be reviewed");
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ApiError(400, "Only completed bookings can be reviewed");
    }

    const bookingItem = resolveBookingItem(booking);
    const requestedItemType = mapItemType(payload.itemType);

    if (!bookingItem.itemId) {
      throw new ApiError(400, "Booking item is not available for review");
    }

    if (requestedItemType !== bookingItem.itemType || payload.itemId !== bookingItem.itemId) {
      throw new ApiError(400, "Review item must match the booked item");
    }

    const existingReview = await tx.review.findFirst({
      where: {
        bookingId: booking.id,
      },
      select: {
        id: true,
      },
    });

    if (existingReview) {
      throw new ApiError(409, "Review already exists for this booking");
    }

    const review = await tx.review.create({
      data: {
        userId,
        bookingId: booking.id,
        itemId: payload.itemId,
        itemType: requestedItemType,
        rating: payload.rating,
        title: payload.title,
        comment: payload.comment,
      },
      select: reviewSelect,
    });

    await recalculateListingRating(tx, review.itemType, review.itemId);

    return review;
  });
};

export const getAverageRating = async (itemId: string, itemType: ItemType) => {
  const aggregate = await prisma.review.aggregate({
    where: {
      itemId,
      itemType,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    averageRating: aggregate._avg.rating || 0,
    totalReviews: aggregate._count.id || 0,
  };
};

export const getReviewsByItem = async (query: GetReviewsQueryInput) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    itemId: query.itemId,
    itemType: mapItemType(query.itemType),
  };

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: reviewSelect,
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    reviews,
  };
};

export const updateReview = async (userId: string, reviewId: string, payload: UpdateReviewInput) => {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    if (review.userId !== userId) {
      throw new ApiError(403, "You are not allowed to update this review");
    }

    const data: Prisma.ReviewUpdateInput = {};

    if (payload.rating !== undefined) {
      data.rating = payload.rating;
    }

    if (payload.title !== undefined) {
      data.title = payload.title;
    }

    if (payload.comment !== undefined) {
      data.comment = payload.comment;
    }

    const updatedReview = await tx.review.update({
      where: { id: review.id },
      data,
      select: reviewSelect,
    });

    await recalculateListingRating(tx, updatedReview.itemType, updatedReview.itemId);

    return updatedReview;
  });
};

export const deleteReview = async (userId: string, reviewId: string) => {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        itemType: true,
        itemId: true,
      },
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    if (review.userId !== userId) {
      throw new ApiError(403, "You are not allowed to delete this review");
    }

    await tx.review.delete({
      where: { id: review.id },
    });

    await recalculateListingRating(tx, review.itemType, review.itemId);

    return {};
  });
};

export const markReviewHelpful = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: reviewSelect,
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  return {
    id: review.id,
  };
};

export const getOwnerReviews = async (
  ownerId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const where = {
    itemType: ItemType.STAY,
    booking: {
      stay: {
        ownerId,
      },
    },
  } satisfies Prisma.ReviewWhereInput;

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        itemId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ownerReply: true,
        booking: {
          select: {
            stay: {
              select: {
                id: true,
                title: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
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
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      ownerReply: r.ownerReply,
      createdAt: r.createdAt,
      guest: {
        name: r.user?.name ?? "Guest",
        email: r.user?.email ?? "",
      },
      stayTitle: r.booking?.stay?.title ?? "Property",
      roomName: r.booking?.room?.name ?? null,
    })),
  };
};

export const replyToReview = async (ownerId: string, reviewId: string, reply: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      booking: {
        select: {
          stay: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (review.booking?.stay?.ownerId !== ownerId) {
    throw new ApiError(403, "You can only reply to reviews for your own properties");
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: { ownerReply: reply },
    select: reviewSelect,
  });
};

export const getReview = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: reviewSelect,
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  return review;
};

export const getUserReviews = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where: { userId } }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        ...reviewSelect,
        booking: {
          select: {
            stay: {
              select: {
                id: true,
                title: true,
                images: true,
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
    reviews: reviews.map((r) => ({
      ...r,
      stay: r.booking?.stay
        ? {
            ...r.booking.stay,
            name: r.booking.stay.title,
          }
        : null,
    })),
  };
};

export const getMyReviews = getUserReviews;

export const reportReview = async (reviewId: string, payload: import("../schemas/reviews.schema").ReportReviewInput) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      flaggedAt: new Date(),
      flagReason: payload.reason,
    },
  });

  return {};
};

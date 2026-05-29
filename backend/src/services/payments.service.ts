import { AuditAction, AuditEntityType, BookingStatus, MembershipTier, PaymentStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "../config/prisma";
import { ProcessPaymentInput } from "../schemas/payments.schema";
import {
  bookingPaymentFailureAction,
  expireBookingHoldIfNeeded,
  expireStaleHoldBookings,
} from "./booking-lock.service";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { ApiError } from "../utils/error.util";
import { parsePagination } from "../utils/pagination.util";

const paymentSelect = {
  id: true,
  bookingId: true,
  userId: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  status: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

const paymentProvider = process.env.PAYMENT_PROVIDER?.trim().toLowerCase() ?? "";
const isTestPaymentProvider =
  paymentProvider === "test" || (paymentProvider.length === 0 && process.env.NODE_ENV !== "production");

const generateTransactionId = (): string => {
  return `txn_test_${randomUUID()}`;
};

const bookingPaymentSelect = {
  id: true,
  userId: true,
  totalPrice: true,
  status: true,
  expiresAt: true,
} satisfies Prisma.BookingSelect;

const shouldForcePaymentFailure = String(process.env.PAYMENT_MOCK_FORCE_FAILURE ?? "").toLowerCase() === "true";

const goldThreshold = new Prisma.Decimal(1500);
const platinumThreshold = new Prisma.Decimal(5000);

const resolveMembershipTier = (lifetimeSpend: Prisma.Decimal): MembershipTier => {
  if (lifetimeSpend.gte(platinumThreshold)) {
    return MembershipTier.PLATINUM;
  }

  if (lifetimeSpend.gte(goldThreshold)) {
    return MembershipTier.GOLD;
  }

  return MembershipTier.SILVER;
};

export const processPayment = async (userId: string, payload: ProcessPaymentInput) => {
  if (process.env.NODE_ENV === "production" && !paymentProvider) {
    throw new ApiError(503, "Payment provider is not configured");
  }

  if (process.env.NODE_ENV === "production" && isTestPaymentProvider) {
    throw new ApiError(503, "Payment provider is not configured");
  }

  if (!isTestPaymentProvider) {
    throw new ApiError(501, "Configured payment provider is not implemented");
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        await expireStaleHoldBookings(tx);

        const booking = await tx.booking.findUnique({
          where: { id: payload.bookingId },
          select: bookingPaymentSelect,
        });

        if (!booking) {
          throw new ApiError(404, "Booking not found");
        }

        if (booking.userId !== userId) {
          throw new ApiError(403, "You are not allowed to pay for this booking");
        }

        const expired = await expireBookingHoldIfNeeded(tx, booking);
        if (expired) {
          throw new ApiError(400, "Booking hold has expired");
        }

        if (booking.status === BookingStatus.CANCELLED) {
          throw new ApiError(400, "Cancelled booking cannot be paid");
        }

        if (booking.status === BookingStatus.COMPLETED) {
          throw new ApiError(400, "Completed booking cannot be paid");
        }

        if (booking.status === BookingStatus.EXPIRED) {
          throw new ApiError(400, "Expired booking cannot be paid");
        }

        const existingSuccessfulPayment = await tx.payment.findFirst({
          where: {
            bookingId: booking.id,
            status: PaymentStatus.SUCCESS,
          },
          select: {
            id: true,
          },
        });

        if (existingSuccessfulPayment) {
          throw new ApiError(409, "Successful payment already exists for this booking");
        }

        if (booking.status !== BookingStatus.HOLD) {
          throw new ApiError(400, "Only held bookings can be paid");
        }

        if (!booking.expiresAt || booking.expiresAt.getTime() <= Date.now()) {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.EXPIRED,
              expiresAt: null,
            },
            select: {
              id: true,
            },
          });

          throw new ApiError(400, "Booking hold has expired");
        }

        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            userId,
            amount: booking.totalPrice,
            currency: payload.currency.toUpperCase(),
            paymentMethod: payload.paymentMethod,
            transactionId: generateTransactionId(),
            status: shouldForcePaymentFailure ? PaymentStatus.FAILED : PaymentStatus.SUCCESS,
          },
          select: paymentSelect,
        });

        if (payment.status === PaymentStatus.FAILED) {
          const bookingAfterFailure = await tx.booking.update({
            where: { id: booking.id },
            data:
              bookingPaymentFailureAction === "cancelled"
                ? {
                    status: BookingStatus.CANCELLED,
                    expiresAt: null,
                  }
                : {
                    status: BookingStatus.HOLD,
                  },
            select: {
              id: true,
              status: true,
              expiresAt: true,
            },
          });

          if (bookingAfterFailure.status !== booking.status) {
            await writeAuditLog(tx, {
              userId,
              action: AuditAction.BOOKING_STATUS_CHANGED,
              entityType: AuditEntityType.BOOKING,
              entityId: booking.id,
              metadata: buildBeforeAfterMetadata(
                {
                  status: booking.status,
                  expiresAt: booking.expiresAt?.toISOString() ?? null,
                },
                {
                  status: bookingAfterFailure.status,
                  expiresAt: bookingAfterFailure.expiresAt?.toISOString() ?? null,
                  reason: "payment_failed",
                },
              ),
            });
          }

          return payment;
        }

        const bookingConfirmation = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.HOLD,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            status: BookingStatus.CONFIRMED,
            expiresAt: null,
          },
        });

        if (bookingConfirmation.count !== 1) {
          throw new ApiError(409, "Booking hold has expired or is no longer payable");
        }

        await writeAuditLog(tx, {
          userId,
          action: AuditAction.BOOKING_STATUS_CHANGED,
          entityType: AuditEntityType.BOOKING,
          entityId: booking.id,
          metadata: buildBeforeAfterMetadata(
            {
              status: booking.status,
              expiresAt: booking.expiresAt?.toISOString() ?? null,
            },
            {
              status: BookingStatus.CONFIRMED,
              expiresAt: null,
              reason: "payment_success",
              paymentMethod: payment.paymentMethod,
              paymentId: payment.id,
            },
          ),
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            lifetimeSpend: {
              increment: booking.totalPrice,
            },
          },
          select: {
            id: true,
            lifetimeSpend: true,
            membershipTier: true,
          },
        });

        const nextTier = resolveMembershipTier(updatedUser.lifetimeSpend);

        if (nextTier !== updatedUser.membershipTier) {
          await tx.user.update({
            where: { id: updatedUser.id },
            data: {
              membershipTier: nextTier,
            },
            select: {
              id: true,
            },
          });
        }

        return payment;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "Successful payment already exists for this booking");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new ApiError(409, "Payment could not be finalized due to a concurrent booking update. Please retry.");
    }

    throw error;
  }
};

export const getUserPayments = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
) => {
  const { page, limit, skip, take } = parsePagination(pagination);

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: paymentSelect,
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    payments,
  };
};

export const getPaymentById = async (userId: string, paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: paymentSelect,
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (payment.userId !== userId) {
    throw new ApiError(403, "You are not allowed to access this payment");
  }

  return payment;
};

export const requestRefund = async (userId: string, paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      ...paymentSelect,
      bookingId: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (payment.userId !== userId) {
    throw new ApiError(403, "You are not allowed to refund this payment");
  }

  if (payment.status !== PaymentStatus.SUCCESS) {
    throw new ApiError(400, "Only successful payments can be refunded");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Mark payment as refunded
      const refundedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
        select: paymentSelect,
      });

      // 2. Cancel the associated booking
      const booking = await tx.booking.findUnique({
        where: { id: payment.bookingId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      });

      if (
        booking &&
        booking.status !== BookingStatus.CANCELLED &&
        booking.status !== BookingStatus.EXPIRED
      ) {
        const previousStatus = booking.status;

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            expiresAt: null,
          },
        });

        await writeAuditLog(tx, {
          userId,
          action: AuditAction.BOOKING_STATUS_CHANGED,
          entityType: AuditEntityType.BOOKING,
          entityId: booking.id,
          metadata: buildBeforeAfterMetadata(
            {
              status: previousStatus,
              expiresAt: booking.expiresAt?.toISOString() ?? null,
            },
            {
              status: BookingStatus.CANCELLED,
              expiresAt: null,
              reason: "payment_refunded",
              paymentId: payment.id,
            },
          ),
        });
      }

      // 3. Reverse the lifetimeSpend and recalculate membership tier
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          lifetimeSpend: {
            decrement: payment.amount,
          },
        },
        select: {
          id: true,
          lifetimeSpend: true,
          membershipTier: true,
        },
      });

      // Clamp lifetimeSpend to zero if it went negative (edge case: partial refunds, data fixes)
      if (updatedUser.lifetimeSpend.isNegative()) {
        await tx.user.update({
          where: { id: userId },
          data: {
            lifetimeSpend: new Prisma.Decimal(0),
          },
        });
        updatedUser.lifetimeSpend = new Prisma.Decimal(0);
      }

      const nextTier = resolveMembershipTier(updatedUser.lifetimeSpend);

      if (nextTier !== updatedUser.membershipTier) {
        await tx.user.update({
          where: { id: updatedUser.id },
          data: {
            membershipTier: nextTier,
          },
        });
      }

      return refundedPayment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );

  return result;
};

import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { getLogger, serializeError } from "../utils/logger.util";

const notificationLogger = getLogger("services.notification");

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Result envelope returned by every notification persistence call so callers
 * can react intentionally instead of treating success and silent failure as
 * the same outcome.
 */
export type NotificationDeliveryResult =
  | {
      ok: true;
      notificationId: string;
      userId: string;
      type: string;
    }
  | {
      ok: false;
      userId: string;
      type: string;
      error: { name: string; message: string };
    };

export interface RideNotificationSummary {
  bookingId: string;
  status: string;
  attempted: number;
  delivered: number;
  failed: number;
  failures: Array<Pick<NotificationDeliveryResult & { ok: false }, "userId" | "type" | "error">>;
}

interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Internal: structured logging helpers
//
// We keep notification logs free of secrets. Titles/messages MAY contain
// human-friendly content but they MUST NOT contain OTPs, raw addresses, or
// auth tokens — that contract is enforced by the templating in
// `buildRideNotifications` below.
// ────────────────────────────────────────────────────────────────────────────

const logDeliverySuccess = (input: NotificationInput, notificationId: string): void => {
  notificationLogger.info(
    {
      userId: input.userId,
      type: input.type,
      notificationId,
    },
    "Notification persisted",
  );
};

const logDeliveryFailure = (input: NotificationInput, error: unknown): void => {
  notificationLogger.error(
    {
      userId: input.userId,
      type: input.type,
      err: serializeError(error),
    },
    "Notification persistence failed",
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Best-effort notification — never throws, returns a structured result.
//
// Callers are expected to inspect the result if they care about delivery.
// This is the default path for ride lifecycle side effects: the lifecycle
// transaction has already committed, so we don't want a DB hiccup in the
// notification table to roll back the ride state change.
// ────────────────────────────────────────────────────────────────────────────

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
): Promise<NotificationDeliveryResult> => {
  const input: NotificationInput = { userId, type, title, message };

  try {
    const created = await prisma.notification.create({
      data: input,
      select: { id: true },
    });

    logDeliverySuccess(input, created.id);

    return {
      ok: true,
      notificationId: created.id,
      userId,
      type,
    };
  } catch (error) {
    logDeliveryFailure(input, error);

    return {
      ok: false,
      userId,
      type,
      error: {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Critical notification — throws ApiError on failure.
//
// Use this for flows where the caller treats notification persistence as
// part of the same logical unit of work (e.g. account verification email
// confirmation receipts). Currently no caller in the codebase uses this
// path, but it's exposed so callers don't have to invent their own
// error-propagation strategy.
// ────────────────────────────────────────────────────────────────────────────

export const dispatchCriticalNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  tx?: Prisma.TransactionClient,
): Promise<{ notificationId: string }> => {
  const db = tx ?? prisma;

  try {
    const created = await db.notification.create({
      data: { userId, type, title, message },
      select: { id: true },
    });

    notificationLogger.info(
      { userId, type, notificationId: created.id },
      "Critical notification persisted",
    );

    return { notificationId: created.id };
  } catch (error) {
    notificationLogger.error(
      { userId, type, err: serializeError(error) },
      "Critical notification persistence failed",
    );

    throw new ApiError(500, "Failed to persist critical notification");
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Ride-status notification dispatcher
// ────────────────────────────────────────────────────────────────────────────

interface RideNotificationBooking {
  id: string;
  userId: string;
  vehicle?: { driverId?: string | null; brand?: string | null; model?: string | null } | null;
  user?: { name?: string | null } | null;
  // Prisma.Decimal-or-number-or-null. We never log this raw — it's only
  // formatted into the message string.
  totalPrice?: unknown;
}

const formatAmount = (value: unknown): string => {
  if (value === null || value === undefined) return "0";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString();
};

const buildRideNotifications = (
  booking: RideNotificationBooking,
  newStatus: string,
): NotificationInput[] => {
  const customerId = booking.userId;
  const driverId = booking.vehicle?.driverId ?? null;
  const driverName =
    booking.vehicle && (booking.vehicle.brand || booking.vehicle.model)
      ? `${booking.vehicle.brand ?? ""} ${booking.vehicle.model ?? ""}`.trim()
      : "Driver";
  const customerName = booking.user?.name || "Customer";
  const bookingRef = booking.id.slice(-8).toUpperCase();

  const inputs: NotificationInput[] = [];

  switch (newStatus) {
    case "PENDING":
      if (driverId) {
        inputs.push({
          userId: driverId,
          type: "ride_request",
          title: "New Ride Request",
          message: `${customerName} wants to book a ride. Booking #${bookingRef}`,
        });
      }
      break;

    case "DRIVER_ACCEPTED":
      inputs.push({
        userId: customerId,
        type: "ride_accepted",
        title: "Ride Accepted! 🎉",
        message: `Your driver (${driverName}) has accepted the ride #${bookingRef}. They'll be on their way.`,
      });
      break;

    case "DRIVER_REJECTED":
      inputs.push({
        userId: customerId,
        type: "ride_rejected",
        title: "Driver Unavailable",
        message: `The driver declined your ride request #${bookingRef}. You can try another driver.`,
      });
      break;

    case "ARRIVED":
      inputs.push({
        userId: customerId,
        type: "driver_arrived",
        title: "Driver Has Arrived 📍",
        message: `Your driver has arrived at the pickup location for ride #${bookingRef}. Share your OTP to start the trip.`,
      });
      break;

    case "ONGOING":
      inputs.push({
        userId: customerId,
        type: "ride_started",
        title: "Trip Started 🚗",
        message: `Your trip #${bookingRef} has started. Enjoy your ride!`,
      });
      break;

    case "COMPLETION_PENDING_CONFIRMATION":
      inputs.push({
        userId: customerId,
        type: "ride_completed",
        title: "Trip Complete ✓",
        message: `Your driver has marked ride #${bookingRef} as complete. Please confirm and proceed to payment.`,
      });
      break;

    case "PAID":
    case "COMPLETED": {
      const amount = formatAmount(booking.totalPrice);
      inputs.push({
        userId: customerId,
        type: "payment_success",
        title: "Payment Successful 💳",
        message: `₹${amount} has been processed for ride #${bookingRef}. Thank you!`,
      });
      if (driverId) {
        inputs.push({
          userId: driverId,
          type: "payment_received",
          title: "Payment Received",
          message: `Payment of ₹${amount} received for ride #${bookingRef}.`,
        });
      }
      break;
    }

    case "CANCELLED_BY_CUSTOMER":
      if (driverId) {
        inputs.push({
          userId: driverId,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          message: `${customerName} has cancelled ride #${bookingRef}.`,
        });
      }
      break;

    case "CANCELLED_BY_DRIVER":
      inputs.push({
        userId: customerId,
        type: "ride_cancelled",
        title: "Ride Cancelled by Driver",
        message: `Your driver cancelled ride #${bookingRef}. Please try booking another driver.`,
      });
      break;

    case "EXPIRED":
      inputs.push({
        userId: customerId,
        type: "ride_expired",
        title: "Booking Expired",
        message: `Your ride request #${bookingRef} has expired as no driver accepted within the time limit.`,
      });
      if (driverId) {
        inputs.push({
          userId: driverId,
          type: "ride_expired",
          title: "Booking Expired",
          message: `Ride request #${bookingRef} expired.`,
        });
      }
      break;
  }

  return inputs;
};

/**
 * Fire the appropriate notification(s) for a ride status transition.
 *
 * Returns a structured summary so the lifecycle service can log partial
 * failures with context. Notifications are fanned out concurrently via
 * `Promise.allSettled` so one slow/failed insert cannot block the others.
 *
 * This function NEVER throws. Callers that need fail-fast semantics should
 * use `dispatchCriticalNotification` or inspect `summary.failed`.
 */
export const fireRideNotification = async (
  booking: RideNotificationBooking,
  newStatus: string,
  // actorRole is kept for backward compatibility; routing is fully driven
  // by `newStatus` because every transition has a fixed recipient set.
  _actorRole: "customer" | "driver",
): Promise<RideNotificationSummary> => {
  const targets = buildRideNotifications(booking, newStatus);

  if (targets.length === 0) {
    return {
      bookingId: booking.id,
      status: newStatus,
      attempted: 0,
      delivered: 0,
      failed: 0,
      failures: [],
    };
  }

  // Run all per-recipient inserts concurrently. createNotification never
  // throws so allSettled is technically belt-and-braces, but it makes the
  // intent explicit and protects us if the contract changes later.
  const results = await Promise.allSettled(
    targets.map((target) =>
      createNotification(target.userId, target.type, target.title, target.message),
    ),
  );

  const failures: RideNotificationSummary["failures"] = [];
  let delivered = 0;

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      if (result.value.ok) {
        delivered += 1;
      } else {
        failures.push({
          userId: result.value.userId,
          type: result.value.type,
          error: result.value.error,
        });
      }
    } else {
      const target = targets[index]!;
      failures.push({
        userId: target.userId,
        type: target.type,
        error: {
          name: result.reason instanceof Error ? result.reason.name : "UnknownError",
          message:
            result.reason instanceof Error ? result.reason.message : String(result.reason),
        },
      });
    }
  }

  const summary: RideNotificationSummary = {
    bookingId: booking.id,
    status: newStatus,
    attempted: targets.length,
    delivered,
    failed: failures.length,
    failures,
  };

  if (summary.failed > 0) {
    notificationLogger.error(
      {
        bookingId: summary.bookingId,
        status: summary.status,
        attempted: summary.attempted,
        delivered: summary.delivered,
        failed: summary.failed,
        failures: summary.failures,
      },
      "Ride notification dispatch had failures",
    );
  } else {
    notificationLogger.info(
      {
        bookingId: summary.bookingId,
        status: summary.status,
        delivered: summary.delivered,
      },
      "Ride notifications dispatched",
    );
  }

  return summary;
};


// ────────────────────────────────────────────────────────────────────────────
// User-facing read/list operations
//
// Used by the notifications controller. Keeps controllers thin (no direct
// Prisma access) and centralises pagination + ownership semantics.
// ────────────────────────────────────────────────────────────────────────────

import { parsePagination } from "../utils/pagination.util";

export interface ListNotificationsResult {
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const listUserNotifications = async (
  userId: string,
  pagination?: { page?: number; limit?: number },
): Promise<ListNotificationsResult> => {
  const { page, limit, skip, take } = parsePagination({
    ...pagination,
    // Notifications use a tighter cap than the global default to keep
    // mobile payloads small.
    limit: pagination?.limit ?? 20,
  });

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: Math.min(take, 50),
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    page,
    limit: Math.min(limit, 50),
    total,
    totalPages: Math.ceil(total / Math.min(limit, 50)),
  };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  // Use updateMany with a userId guard so a malicious client cannot mark
  // someone else's notification as read; zero rows updated → 404.
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  if (result.count !== 1) {
    throw new ApiError(404, "Notification not found");
  }

  const refreshed = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!refreshed) {
    throw new ApiError(404, "Notification not found");
  }

  return refreshed;
};

export const markAllNotificationsRead = async (userId: string): Promise<{ count: number }> => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { count: result.count };
};

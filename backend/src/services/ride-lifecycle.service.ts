import { AuditAction, AuditEntityType, BookingStatus, BookingType, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";
import { buildBeforeAfterMetadata, writeAuditLog } from "./audit-log.service";
import { fireRideNotification } from "./notification.service";
import {
  assertRideActorAuthorized,
  assertTransitionLegal,
  assertVehicleBooking,
  type RideActorRole,
} from "./ride-authorization.service";

const rideLogger = getLogger("services.ride-lifecycle");

// Re-export so existing import paths (`ride-lifecycle.service`) continue
// to work for downstream consumers.
export type { RideActorRole };

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface RideTransitionPayload {
  otp?: string;
  reason?: string | undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// Lifecycle policy
//
// The single source of truth for legal (currentStatus → targetStatus) edges
// AND which actor roles may drive each edge lives in
// `ride-authorization.service.ts`. The lifecycle service does NOT redeclare
// the transition map or the actor map — it only consumes them via
// `assertTransitionLegal` and `assertRideActorAuthorized`. Keeping legality
// and authorization coupled in one table prevents the two checks from
// drifting against each other.
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Idempotency contract
//
// Every ride lifecycle entrypoint is safe to retry. Layered protections:
//
//   1. No-op replay (per-step):
//      If the booking is already in the requested target status, the call
//      returns the current booking without further mutations or notifications.
//      Logged with event=lifecycle_noop_replay.
//
//   2. Concurrent-update guard (per-step):
//      Status mutations use `updateMany({ where: { id, status } })` and
//      assert `count === 1`. Two concurrent transitions cannot both win;
//      the loser receives a 409 and the whole transaction rolls back.
//      The driverCancelCount increment lives in the same transaction so a
//      losing transition cannot leave the counter incremented.
//
//   3. Whole-chain idempotency (compound flows):
//      `transitionRideStatusChain` short-circuits when the booking is
//      already at the chain's final target, so a retried compound action
//      (e.g. customerMarkRidePaid: PAID → COMPLETED) returns 200 with the
//      current state instead of a confusing "Cannot transition from
//      COMPLETED to PAID" 400. Logged with event=lifecycle_chain_replayed.
//
//   4. Notifications fire AFTER commit (out of band):
//      If a duplicate request lands as a no-op, no notifications fire.
//      Real transitions still notify exactly once per successful edge.
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Audit contract
//
// Every successful ride status transition writes one AuditLog row INSIDE the
// same Prisma transaction as the booking update. Properties:
//
//   - action:     AuditAction.BOOKING_STATUS_CHANGED for forward transitions,
//                 AuditAction.BOOKING_CANCELLED for cancellations.
//   - entityType: AuditEntityType.BOOKING
//   - entityId:   the booking id
//   - userId:     the human actor's id (driver, customer, admin) or null for
//                 system-driven transitions (expiry job, system-completed)
//   - metadata:   { event, before, after }
//                   event:  one of "ride_lifecycle_transition" |
//                           "ride_lifecycle_admin_override"
//                   before: { status }
//                   after:  { status, actorRole, reason?, cancelledBy? }
//
// The audit-log service strips any field whose key matches /otp|password|
// token|authorization|cookie|secret|api[_-]?key|refresh/i, so even a
// forgotten OTP would be redacted. We additionally never pass the OTP into
// the metadata object — defense in depth.
//
// Because the audit row is part of the same transaction:
//   - if the lifecycle update rolls back, the audit row rolls back too
//   - if the audit insert fails, the lifecycle update rolls back too
// This prevents "ghost" audit rows for transitions that didn't really
// happen and prevents committed transitions without an audit trail.
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Booking include for all ride lifecycle queries
// ────────────────────────────────────────────────────────────────────────────

const rideInclude = {
  vehicle: {
    select: {
      driverId: true,
      brand: true,
      model: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
} satisfies Prisma.BookingInclude;

type RideBooking = Prisma.BookingGetPayload<{ include: typeof rideInclude }>;

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers (lifecycle-specific)
// ────────────────────────────────────────────────────────────────────────────

const buildTransitionUpdateData = (
  targetStatus: BookingStatus,
  actorRole: RideActorRole,
  payload?: RideTransitionPayload,
): Prisma.BookingUpdateInput => {
  const data: Prisma.BookingUpdateInput = { status: targetStatus };

  if (targetStatus === BookingStatus.COMPLETED || targetStatus === BookingStatus.PAID) {
    data.completedAt = new Date();
  }

  if (targetStatus === BookingStatus.PAYMENT_PENDING) {
    data.customerConfirmedAt = new Date();
  }

  if (
    targetStatus === BookingStatus.CANCELLED_BY_CUSTOMER ||
    targetStatus === BookingStatus.CANCELLED_BY_DRIVER
  ) {
    data.cancelledBy =
      actorRole === "admin" ? "admin" : actorRole === "system" ? "system" : actorRole;
    data.cancelReason = payload?.reason ?? null;
  }

  return data;
};

// ────────────────────────────────────────────────────────────────────────────
// Core transition function — the ONLY place that mutates ride.status
// ────────────────────────────────────────────────────────────────────────────

/**
 * Single transition step executed inside an existing transaction. Used by
 * `transitionRideStatus` (one step) and `transitionRideStatusChain` (multiple
 * steps in a single tx).
 *
 * Returns both the updated booking and a `notifyArgs` payload so the caller
 * can fire notifications AFTER the transaction commits. Notifications stay
 * outside the transaction because they are best-effort side effects and
 * a notification failure should never roll back a lifecycle change.
 */
const performTransitionWithinTx = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  actorId: string,
  actorRole: RideActorRole,
  targetStatus: BookingStatus,
  payload: RideTransitionPayload | undefined,
): Promise<{
  booking: RideBooking;
  noop: boolean;
  notifyArgs: { booking: RideBooking; status: BookingStatus; actor: "customer" | "driver" } | null;
}> => {
  // Read INSIDE the tx so the status we validate against is the same row
  // we will write to, with no chance of an interleaving update slipping in.
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: rideInclude,
  });

  assertVehicleBooking(booking);

  // Idempotent no-op: same status requested again (e.g. retry after timeout,
  // duplicate tap, or network-retried mobile request). Authorization is
  // intentionally NOT enforced for the no-op case so a retried client request
  // doesn't 403 because the requested edge has no matching rule
  // (e.g. ARRIVED → ARRIVED).
  if (booking.status === targetStatus) {
    rideLogger.info(
      {
        event: "lifecycle_noop_replay",
        bookingId,
        status: booking.status,
        actorId,
        actorRole,
      },
      "Ride transition no-op (already at target)",
    );
    return { booking, noop: true, notifyArgs: null };
  }

  assertRideActorAuthorized(booking, actorId, actorRole, booking.status, targetStatus);
  assertTransitionLegal(booking.status, targetStatus, actorRole);

  if (targetStatus === BookingStatus.ONGOING) {
    const storedOtp = (booking.guestDetails as { otp?: string } | null)?.otp;
    if (!storedOtp || storedOtp !== payload?.otp) {
      throw new ApiError(400, "Invalid OTP. Please ask the customer for the correct code.");
    }
  }

  const updateData = buildTransitionUpdateData(targetStatus, actorRole, payload);

  // Conditional update guards against concurrent transitions: only update
  // when the status is still what we read. A zero-row result means another
  // transition committed first; we abort with a 409 and the whole tx rolls
  // back. This keeps the booking + driver counter mutually consistent.
  const updateResult = await tx.booking.updateMany({
    where: {
      id: bookingId,
      status: booking.status,
    },
    data: updateData,
  });

  if (updateResult.count !== 1) {
    throw new ApiError(
      409,
      "Ride status changed concurrently. Please refresh and retry.",
    );
  }

  if (targetStatus === BookingStatus.CANCELLED_BY_DRIVER && booking.vehicle?.driverId) {
    await tx.user.update({
      where: { id: booking.vehicle.driverId },
      data: { driverCancelCount: { increment: 1 } },
    });
    rideLogger.warn(`Driver ${booking.vehicle.driverId} cancel count incremented`);
  }

  const next = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: rideInclude,
  });

  // Atomic audit row. Cancellations get a more specific action so audit
  // queries can split lifecycle events from cancellations cleanly.
  const auditAction =
    targetStatus === BookingStatus.CANCELLED_BY_CUSTOMER ||
    targetStatus === BookingStatus.CANCELLED_BY_DRIVER
      ? AuditAction.BOOKING_CANCELLED
      : AuditAction.BOOKING_STATUS_CHANGED;

  // System and admin transitions persist with `userId: null` because the
  // synthetic actorId values ("system", admin user id) shouldn't masquerade
  // as a real user id when the actor is the platform itself. Admin overrides
  // are still attributable: the adminId is captured in the metadata.
  const auditUserId =
    actorRole === "system" ? null : actorRole === "admin" ? null : actorId;

  // NOTE: We deliberately do NOT include payload.otp here. The audit-log
  // service redacts /otp/i keys as a safety net, but the explicit omission
  // is the primary contract.
  const auditMetadata: Record<string, unknown> = {
    event:
      actorRole === "admin"
        ? "ride_lifecycle_admin_override"
        : "ride_lifecycle_transition",
    ...buildBeforeAfterMetadata(
      { status: booking.status },
      {
        status: targetStatus,
        actorRole,
        ...(actorRole === "admin" ? { adminId: actorId } : {}),
        ...(next.cancelledBy ? { cancelledBy: next.cancelledBy } : {}),
        ...(next.cancelReason ? { reason: next.cancelReason } : {}),
      },
    ),
  };

  await writeAuditLog(tx, {
    userId: auditUserId,
    action: auditAction,
    entityType: AuditEntityType.BOOKING,
    entityId: bookingId,
    metadata: auditMetadata,
  });

  rideLogger.info(
    {
      event: "lifecycle_transition",
      bookingId,
      from: booking.status,
      to: targetStatus,
      actorId,
      actorRole,
    },
    "Ride lifecycle transition committed",
  );

  const notifyActor: "customer" | "driver" = actorRole === "driver" ? "driver" : "customer";

  return {
    booking: next,
    noop: false,
    notifyArgs: { booking: next, status: targetStatus, actor: notifyActor },
  };
};

/**
 * Fire the post-transition notifications collected during a transaction.
 * Notifications are intentionally outside the transaction boundary — they
 * are best-effort side effects and partial failure is logged but does not
 * roll back the lifecycle update.
 */
const dispatchNotificationsAfterCommit = (
  notifyQueue: Array<{
    booking: RideBooking;
    status: BookingStatus;
    actor: "customer" | "driver";
    actorId: string;
    actorRole: RideActorRole;
  }>,
): void => {
  for (const item of notifyQueue) {
    fireRideNotification(item.booking, item.status, item.actor)
      .then((summary) => {
        if (summary.failed > 0) {
          rideLogger.error(
            {
              bookingId: item.booking.id,
              targetStatus: item.status,
              actorRole: item.actorRole,
              actorId: item.actorId,
              attempted: summary.attempted,
              delivered: summary.delivered,
              failed: summary.failed,
              failures: summary.failures,
            },
            "Ride notification dispatch had failures",
          );
        }
      })
      .catch((err) => {
        rideLogger.error(
          {
            err,
            bookingId: item.booking.id,
            targetStatus: item.status,
            actorRole: item.actorRole,
            actorId: item.actorId,
          },
          "Unexpected error from fireRideNotification",
        );
      });
  }
};

/**
 * Centralized ride state machine. Every ride status mutation in the system
 * MUST flow through this function (or `transitionRideStatusChain` for
 * multi-step atomic flows like customerMarkRidePaid).
 *
 * Responsibilities:
 *   1. Read the booking inside a Prisma transaction
 *   2. Validate actor authorization (ownership + per-edge actor allow-list)
 *   3. Validate state transition against the lifecycle map
 *   4. Verify OTP for trip start
 *   5. Atomically apply the status update with a status-conditional WHERE
 *      so concurrent transitions cannot both win
 *   6. Atomically apply dependent counters (driver cancel count)
 *   7. After commit, fire post-transition notifications (best-effort)
 *
 * Throws `ApiError` for every invalid case. Callers should not catch.
 */
export const transitionRideStatus = async (
  bookingId: string,
  actorId: string,
  actorRole: RideActorRole,
  targetStatus: BookingStatus,
  payload?: RideTransitionPayload,
): Promise<RideBooking> => {
  const result = await prisma.$transaction(async (tx) => {
    return performTransitionWithinTx(tx, bookingId, actorId, actorRole, targetStatus, payload);
  });

  if (result.notifyArgs) {
    dispatchNotificationsAfterCommit([
      { ...result.notifyArgs, actorId, actorRole },
    ]);
  }

  return result.booking;
};

/**
 * Execute a chain of transitions atomically. Either ALL steps commit or
 * NONE do — the booking cannot be left in an intermediate state.
 *
 * Used for compound flows like `customerMarkRidePaid` (PAID → COMPLETED)
 * where pausing between the two updates would leave the booking stuck in
 * a status the customer cannot drive forward themselves.
 *
 * Idempotency:
 *   - Per-step idempotency is inherited from `performTransitionWithinTx`:
 *     a step whose target equals the current status is a no-op.
 *   - Whole-chain idempotency: if the booking is ALREADY at the chain's
 *     final target (a duplicate retry of the chain after success), we
 *     short-circuit and return the booking. Without this guard, a
 *     retried mobile request would be rejected with a "Cannot transition
 *     from COMPLETED to PAID" 400 — confusing for the user, even though
 *     no state corruption is possible.
 */
export const transitionRideStatusChain = async (
  bookingId: string,
  steps: ReadonlyArray<{
    actorId: string;
    actorRole: RideActorRole;
    targetStatus: BookingStatus;
    payload?: RideTransitionPayload;
  }>,
): Promise<RideBooking> => {
  if (steps.length === 0) {
    throw new ApiError(400, "transitionRideStatusChain requires at least one step");
  }

  // Whole-chain idempotency: if the booking is already at the final target
  // status, treat this as a duplicate retry and return the current state.
  const finalTarget = steps[steps.length - 1]!.targetStatus;
  const preBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: rideInclude,
  });
  if (preBooking && preBooking.status === finalTarget) {
    rideLogger.info(
      { event: "lifecycle_chain_replayed", bookingId, finalTarget },
      "Lifecycle chain treated as idempotent (already at final target)",
    );
    return preBooking;
  }

  const notifyQueue: Array<{
    booking: RideBooking;
    status: BookingStatus;
    actor: "customer" | "driver";
    actorId: string;
    actorRole: RideActorRole;
  }> = [];

  let lastBooking: RideBooking | null = null;

  await prisma.$transaction(async (tx) => {
    for (const step of steps) {
      const stepResult = await performTransitionWithinTx(
        tx,
        bookingId,
        step.actorId,
        step.actorRole,
        step.targetStatus,
        step.payload,
      );

      lastBooking = stepResult.booking;

      if (stepResult.notifyArgs) {
        notifyQueue.push({
          ...stepResult.notifyArgs,
          actorId: step.actorId,
          actorRole: step.actorRole,
        });
      }
    }
  });

  // After commit only — partial notification failure cannot affect the
  // committed lifecycle state.
  dispatchNotificationsAfterCommit(notifyQueue);

  if (!lastBooking) {
    // Defensive: at least one step must have produced a booking, even a
    // no-op step refreshes the loaded record.
    throw new ApiError(500, "Lifecycle chain produced no result");
  }

  return lastBooking;
};

// ────────────────────────────────────────────────────────────────────────────
// Convenience wrappers (driver-actor)
// ────────────────────────────────────────────────────────────────────────────

export const acceptRide = (driverId: string, bookingId: string) =>
  transitionRideStatus(bookingId, driverId, "driver", BookingStatus.DRIVER_ACCEPTED);

export const declineRide = (driverId: string, bookingId: string) =>
  transitionRideStatus(bookingId, driverId, "driver", BookingStatus.DRIVER_REJECTED);

export const markDriverArrived = (driverId: string, bookingId: string) =>
  transitionRideStatus(bookingId, driverId, "driver", BookingStatus.ARRIVED);

export const startTrip = (driverId: string, bookingId: string, otp: string) =>
  transitionRideStatus(bookingId, driverId, "driver", BookingStatus.ONGOING, { otp });

export const driverCompleteTrip = (driverId: string, bookingId: string) =>
  transitionRideStatus(
    bookingId,
    driverId,
    "driver",
    BookingStatus.COMPLETION_PENDING_CONFIRMATION,
  );

export const driverCancelRide = (driverId: string, bookingId: string, reason?: string) =>
  transitionRideStatus(
    bookingId,
    driverId,
    "driver",
    BookingStatus.CANCELLED_BY_DRIVER,
    reason ? { reason } : undefined,
  );

// ────────────────────────────────────────────────────────────────────────────
// Convenience wrappers (customer-actor)
// ────────────────────────────────────────────────────────────────────────────

export const customerConfirmCompletion = (customerId: string, bookingId: string) =>
  transitionRideStatus(bookingId, customerId, "customer", BookingStatus.PAYMENT_PENDING);

export const customerMarkRidePaid = async (customerId: string, bookingId: string) =>
  // PAID and COMPLETED must commit atomically. If the second step were a
  // separate transaction and failed, the booking would be stuck in PAID and
  // the customer cannot drive the lifecycle forward themselves (only the
  // system actor can transition PAID → COMPLETED).
  transitionRideStatusChain(bookingId, [
    { actorId: customerId, actorRole: "customer", targetStatus: BookingStatus.PAID },
    { actorId: "system",   actorRole: "system",   targetStatus: BookingStatus.COMPLETED },
  ]);

export const customerReportIssue = (customerId: string, bookingId: string) =>
  transitionRideStatus(bookingId, customerId, "customer", BookingStatus.ONGOING);

export const customerCancelRide = (customerId: string, bookingId: string, reason?: string) =>
  transitionRideStatus(
    bookingId,
    customerId,
    "customer",
    BookingStatus.CANCELLED_BY_CUSTOMER,
    reason ? { reason } : undefined,
  );

// ────────────────────────────────────────────────────────────────────────────
// Convenience wrappers (system-actor)
// ────────────────────────────────────────────────────────────────────────────

export const markRidePaid = (bookingId: string) =>
  transitionRideStatus(bookingId, "system", "system", BookingStatus.PAID);

export const markRideCompleted = (bookingId: string) =>
  transitionRideStatus(bookingId, "system", "system", BookingStatus.COMPLETED);

// ────────────────────────────────────────────────────────────────────────────
// Convenience wrapper (admin-actor) — overrides the state machine
// ────────────────────────────────────────────────────────────────────────────

export const adminOverrideRideStatus = (
  adminId: string,
  bookingId: string,
  targetStatus: BookingStatus,
  reason?: string,
) =>
  transitionRideStatus(
    bookingId,
    adminId,
    "admin",
    targetStatus,
    reason ? { reason } : undefined,
  );

// ────────────────────────────────────────────────────────────────────────────
// Background job: expire stale pending ride requests
// ────────────────────────────────────────────────────────────────────────────

export const expirePendingRideRequests = async (
  maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<number> => {
  const cutoff = new Date(Date.now() - maxAgeMs);

  const staleBookings = await prisma.booking.findMany({
    where: {
      type: BookingType.VEHICLE,
      status: BookingStatus.PENDING,
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });

  if (staleBookings.length === 0) return 0;

  // Drive each expiry through the lifecycle so transition rules and
  // notifications fire consistently. We tolerate per-booking failures so a
  // single bad row cannot block the whole sweep.
  let expired = 0;
  for (const { id } of staleBookings) {
    try {
      await transitionRideStatus(id, "system", "system", BookingStatus.EXPIRED);
      expired += 1;
    } catch (err) {
      rideLogger.error({ err, bookingId: id }, "Failed to expire pending ride");
    }
  }

  rideLogger.info(`Expired ${expired}/${staleBookings.length} stale pending ride requests`);
  return expired;
};

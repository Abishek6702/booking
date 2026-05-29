import { BookingStatus, BookingType } from "@prisma/client";

import { ApiError } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";

const authzLogger = getLogger("services.ride-authorization");

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type RideActorRole = "customer" | "driver" | "system" | "admin";

const KNOWN_ACTOR_ROLES: ReadonlySet<RideActorRole> = new Set([
  "customer",
  "driver",
  "system",
  "admin",
]);

export interface RideAuthorizationBooking {
  id: string;
  type: BookingType;
  userId: string;
  vehicle?: { driverId: string | null } | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Single source of truth for the ride lifecycle:
//   - which (current → target) edges are legal
//   - which actor roles may drive each edge
//
// Both the state-machine validation (legality) and the actor authorization
// (who can perform what) read from this table. Keeping them coupled prevents
// the two checks from drifting against each other.
//
// `admin` is intentionally NOT listed in any edge — it is an explicit
// override path and bypasses both legality and per-edge authorization
// inside the corresponding `assert*` helpers below.
// ────────────────────────────────────────────────────────────────────────────

interface TransitionRule {
  from: BookingStatus;
  to: BookingStatus;
  actors: ReadonlyArray<RideActorRole>;
}

const TRANSITION_RULES: ReadonlyArray<TransitionRule> = [
  // PENDING
  { from: BookingStatus.PENDING, to: BookingStatus.DRIVER_ACCEPTED,        actors: ["driver"]   },
  { from: BookingStatus.PENDING, to: BookingStatus.DRIVER_REJECTED,        actors: ["driver"]   },
  { from: BookingStatus.PENDING, to: BookingStatus.EXPIRED,                actors: ["system"]   },
  { from: BookingStatus.PENDING, to: BookingStatus.CANCELLED_BY_CUSTOMER,  actors: ["customer"] },

  // DRIVER_ACCEPTED
  { from: BookingStatus.DRIVER_ACCEPTED, to: BookingStatus.ARRIVED,                actors: ["driver"]   },
  { from: BookingStatus.DRIVER_ACCEPTED, to: BookingStatus.CANCELLED_BY_DRIVER,    actors: ["driver"]   },
  { from: BookingStatus.DRIVER_ACCEPTED, to: BookingStatus.CANCELLED_BY_CUSTOMER,  actors: ["customer"] },

  // ARRIVED
  { from: BookingStatus.ARRIVED, to: BookingStatus.ONGOING,                actors: ["driver"]   },
  { from: BookingStatus.ARRIVED, to: BookingStatus.CANCELLED_BY_DRIVER,    actors: ["driver"]   },
  { from: BookingStatus.ARRIVED, to: BookingStatus.CANCELLED_BY_CUSTOMER,  actors: ["customer"] },

  // ONGOING
  { from: BookingStatus.ONGOING, to: BookingStatus.COMPLETION_PENDING_CONFIRMATION, actors: ["driver"] },

  // COMPLETION_PENDING_CONFIRMATION
  { from: BookingStatus.COMPLETION_PENDING_CONFIRMATION, to: BookingStatus.PAYMENT_PENDING, actors: ["customer"] },
  // Customer-driven dispute: revert back to ONGOING. Only the customer can
  // do this — drivers cannot un-complete their own trip.
  { from: BookingStatus.COMPLETION_PENDING_CONFIRMATION, to: BookingStatus.ONGOING,         actors: ["customer"] },

  // PAYMENT_PENDING
  { from: BookingStatus.PAYMENT_PENDING, to: BookingStatus.PAID, actors: ["customer"] },

  // PAID
  { from: BookingStatus.PAID, to: BookingStatus.COMPLETED, actors: ["system"] },
];

// ────────────────────────────────────────────────────────────────────────────
// Indexed views over TRANSITION_RULES
// ────────────────────────────────────────────────────────────────────────────

const buildAllowedTargetsByFrom = (): Map<BookingStatus, ReadonlyArray<BookingStatus>> => {
  const map = new Map<BookingStatus, BookingStatus[]>();
  for (const rule of TRANSITION_RULES) {
    const existing = map.get(rule.from);
    if (existing) {
      existing.push(rule.to);
    } else {
      map.set(rule.from, [rule.to]);
    }
  }
  return map as Map<BookingStatus, ReadonlyArray<BookingStatus>>;
};

const buildAllowedTargetsByActor = (): Map<RideActorRole, ReadonlyArray<BookingStatus>> => {
  const map = new Map<RideActorRole, BookingStatus[]>();
  for (const rule of TRANSITION_RULES) {
    for (const actor of rule.actors) {
      const existing = map.get(actor);
      if (existing) {
        if (!existing.includes(rule.to)) existing.push(rule.to);
      } else {
        map.set(actor, [rule.to]);
      }
    }
  }
  return map as Map<RideActorRole, ReadonlyArray<BookingStatus>>;
};

const ALLOWED_TARGETS_BY_FROM = buildAllowedTargetsByFrom();
const ALLOWED_TARGETS_BY_ACTOR = buildAllowedTargetsByActor();

const findRule = (from: BookingStatus, to: BookingStatus): TransitionRule | undefined =>
  TRANSITION_RULES.find((rule) => rule.from === from && rule.to === to);

/**
 * Targets reachable from a given current status, regardless of actor.
 * Used by the lifecycle service to format helpful 400 messages and by
 * tests/admin tooling.
 */
export const getAllowedTargets = (from: BookingStatus): ReadonlyArray<BookingStatus> => {
  return ALLOWED_TARGETS_BY_FROM.get(from) ?? [];
};

/**
 * Targets ever reachable by a given actor across the whole lifecycle.
 * Used to build clear error messages when an actor tries to perform a
 * transition they will never be able to perform.
 */
export const getAllowedTargetsForActor = (
  actor: RideActorRole,
): ReadonlyArray<BookingStatus> => {
  return ALLOWED_TARGETS_BY_ACTOR.get(actor) ?? [];
};

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

const denyAuthz = (
  reason: string,
  context: Record<string, unknown>,
  apiMessage: string,
  statusCode = 403,
): never => {
  authzLogger.warn(
    {
      event: "authz_denied",
      reason,
      ...context,
    },
    "Ride authorization denied",
  );
  throw new ApiError(statusCode, apiMessage);
};

const requireKnownRole = (actorRole: string): RideActorRole => {
  if (!KNOWN_ACTOR_ROLES.has(actorRole as RideActorRole)) {
    return denyAuthz(
      "unknown_actor_role",
      { actorRole },
      "Unauthorized actor role",
    );
  }
  return actorRole as RideActorRole;
};

const requireNonEmptyActorId = (
  actorRole: RideActorRole,
  actorId: string,
  context: Record<string, unknown>,
): void => {
  // `system` and `admin` flows pass synthetic identifiers; the only roles
  // that strictly require a real user id are `driver` and `customer`.
  if ((actorRole === "driver" || actorRole === "customer") && !actorId) {
    denyAuthz(
      "missing_actor_id",
      { actorRole, ...context },
      "Unauthorized: actor id is required",
    );
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Public assertions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Confirm the booking exists and is a vehicle booking. Throws ApiError on
 * any failure.
 */
export function assertVehicleBooking<T extends RideAuthorizationBooking>(
  booking: T | null,
): asserts booking is T {
  if (!booking) {
    throw new ApiError(404, "Ride not found");
  }
  if (booking.type !== BookingType.VEHICLE) {
    throw new ApiError(400, "This action is only available for vehicle bookings");
  }
}

/**
 * Validate that the (currentStatus → targetStatus) edge is part of the
 * lifecycle. Independent of who is acting. `admin` overrides this check
 * because admin paths are intentionally unconstrained by the state machine.
 */
export const assertTransitionLegal = (
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  actorRole: RideActorRole,
): void => {
  if (actorRole === "admin") return;

  const allowed = ALLOWED_TARGETS_BY_FROM.get(currentStatus);
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Cannot transition ride from "${currentStatus}" to "${targetStatus}". Allowed next states: ${allowed?.join(", ") || "none"}`,
    );
  }
};

/**
 * Verify that an actor has the right to drive a state transition on a ride.
 *
 * Layered checks (each layer is a hard 403 stop with structured authz_denied
 * logging):
 *   1. The actorRole must be one of the four known roles.
 *   2. driver/customer actors must present a non-empty actorId.
 *   3. driver actors must match `booking.vehicle.driverId`.
 *   4. customer actors must match `booking.userId`.
 *   5. The (currentStatus → targetStatus) edge must list the actorRole
 *      among its allowed actors. Admin is exempt — it is the explicit
 *      override path.
 */
export const assertRideActorAuthorized = (
  booking: RideAuthorizationBooking,
  actorId: string,
  actorRoleInput: string,
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
): void => {
  const actorRole = requireKnownRole(actorRoleInput);

  const baseContext = {
    bookingId: booking.id,
    currentStatus,
    targetStatus,
    actorRole,
  };

  // Admin overrides every check below. Logged at info so audits are easy.
  if (actorRole === "admin") {
    authzLogger.info(
      { event: "authz_admin_override", ...baseContext, adminId: actorId },
      "Admin overriding ride authorization checks",
    );
    return;
  }

  requireNonEmptyActorId(actorRole, actorId, baseContext);

  // Driver ownership: must be the assigned driver of the vehicle
  if (actorRole === "driver") {
    const assignedDriverId = booking.vehicle?.driverId ?? null;
    if (!assignedDriverId) {
      denyAuthz(
        "ride_has_no_assigned_driver",
        baseContext,
        "Ride has no assigned driver",
      );
    }
    if (assignedDriverId !== actorId) {
      denyAuthz(
        "driver_not_assigned",
        { ...baseContext, actorId, assignedDriverId },
        "You are not the assigned driver for this ride",
      );
    }
  }

  // Customer ownership: must be the booking owner
  if (actorRole === "customer" && booking.userId !== actorId) {
    denyAuthz(
      "customer_not_booking_owner",
      { ...baseContext, actorId, bookingUserId: booking.userId },
      "You are not the customer for this ride",
    );
  }

  // Per-edge actor permission. The same target status (e.g. ONGOING) can be
  // reachable by different actors depending on the current state, which is
  // why the rule is keyed on the (from, to) edge rather than on the target
  // alone.
  const rule = findRule(currentStatus, targetStatus);
  if (!rule) {
    // Edge not found in the policy table — let the legality check upstream
    // produce the clearer 400 message. We don't double-fault here.
    return;
  }

  if (!rule.actors.includes(actorRole)) {
    const actorAllowedTargets = getAllowedTargetsForActor(actorRole);
    denyAuthz(
      "actor_not_allowed_on_edge",
      {
        ...baseContext,
        edgeAllowedActors: rule.actors,
        actorAllowedTargets,
      },
      `Actor "${actorRole}" is not allowed to transition the ride from ${currentStatus} to ${targetStatus}. Allowed actors for this edge: ${rule.actors.join(", ")}`,
    );
  }
};

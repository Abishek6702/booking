import { BookingStatus, Prisma, VehicleServiceMode } from "@prisma/client";
import type { Response } from "express";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";
import * as rideLifecycle from "./ride-lifecycle.service";

const ridesLogger = getLogger("services.rides");

// ────────────────────────────────────────────────────────────────────────────
// Read selects
// ────────────────────────────────────────────────────────────────────────────

const driverRideListSelect = {
  id: true,
  status: true,
  pickupAddress: true,
  dropoffAddress: true,
  vehicleDistanceKm: true,
  vehicleDurationHours: true,
  totalPrice: true,
  checkIn: true,
  checkOut: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, phone: true, avatarUrl: true },
  },
  vehicle: {
    select: { id: true, brand: true, model: true, type: true },
  },
  driverEarning: {
    select: { grossAmount: true, netAmount: true, commission: true },
  },
} satisfies Prisma.BookingSelect;

const driverRideDetailInclude = {
  user: {
    select: { id: true, name: true, phone: true, avatarUrl: true },
  },
  vehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
      type: true,
      pricePerKm: true,
      baseFare: true,
    },
  },
  driverEarning: true,
} satisfies Prisma.BookingInclude;

// ────────────────────────────────────────────────────────────────────────────
// Driver view: list + fetch
// ────────────────────────────────────────────────────────────────────────────

export interface ListDriverRidesOptions {
  status?: BookingStatus;
  limit?: number;
  offset?: number;
}

export const listDriverRides = async (driverId: string, options: ListDriverRidesOptions = {}) => {
  const { status, limit = 50, offset = 0 } = options;

  return prisma.booking.findMany({
    where: {
      type: "VEHICLE",
      vehicleServiceMode: VehicleServiceMode.RIDE_HAILING,
      vehicle: { driverId },
      ...(status ? { status } : {}),
    },
    select: driverRideListSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const getDriverRideById = async (driverId: string, rideId: string) => {
  if (!rideId) {
    throw new ApiError(400, "rideId is required");
  }

  const ride = await prisma.booking.findFirst({
    where: {
      id: rideId,
      type: "VEHICLE",
      vehicleServiceMode: VehicleServiceMode.RIDE_HAILING,
      vehicle: { driverId },
    },
    include: driverRideDetailInclude,
  });

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  return ride;
};

/**
 * Lightweight existence check used by the SSE stream and by
 * `updateRideStatusByDriver` before forwarding to the lifecycle service.
 *
 * Implementation note: we deliberately filter by `vehicle.driverId` in the
 * query itself so an unauthorized driver receives a 404 (matching the
 * "ride does not exist for this driver" semantic) rather than a 403 that
 * leaks the existence of someone else's ride. The lifecycle service runs
 * a stricter authorization pass downstream that distinguishes ownership
 * failures with a structured authz_denied log entry.
 */
export const assertDriverOwnsRide = async (driverId: string, rideId: string): Promise<string> => {
  if (!driverId) {
    throw new ApiError(401, "Unauthorized: driver identity is required");
  }
  if (!rideId) {
    throw new ApiError(400, "rideId is required");
  }

  const ride = await prisma.booking.findFirst({
    where: {
      id: rideId,
      type: "VEHICLE",
      vehicleServiceMode: VehicleServiceMode.RIDE_HAILING,
      vehicle: { driverId },
    },
    select: { id: true },
  });

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  return ride.id;
};

// ────────────────────────────────────────────────────────────────────────────
// Driver-initiated status transitions
//
// All status mutations forward to ride-lifecycle.service so the state machine
// and authorization checks run consistently. Controllers MUST NOT call
// prisma.booking.update directly for ride statuses.
// ────────────────────────────────────────────────────────────────────────────

const DRIVER_ALLOWED_STATUSES: BookingStatus[] = [
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_REJECTED,
  BookingStatus.ARRIVED,
  BookingStatus.ONGOING,
  BookingStatus.COMPLETION_PENDING_CONFIRMATION,
  BookingStatus.CANCELLED_BY_DRIVER,
];

export interface UpdateRideStatusByDriverInput {
  status: BookingStatus;
  otp?: string;
  reason?: string;
}

export interface RideStatusUpdateResult {
  id: string;
  status: BookingStatus;
  completedAt: Date | null;
  updatedAt: Date;
}

/**
 * Generic driver-side status update used by `PUT /rides/:rideId/status`.
 *
 * Accepts the high-level target status and dispatches to the appropriate
 * lifecycle wrapper. Statuses that require a different actor (customer,
 * system) are rejected here so the responsibility split stays clean. The
 * lifecycle service still performs the full state-machine + authorization
 * check; this layer only enforces the API surface contract.
 */
export const updateRideStatusByDriver = async (
  driverId: string,
  rideId: string,
  input: UpdateRideStatusByDriverInput,
): Promise<RideStatusUpdateResult> => {
  if (!rideId) {
    throw new ApiError(400, "rideId is required");
  }
  if (!input?.status) {
    throw new ApiError(400, "status is required");
  }

  // Ensure the ride exists and the driver is assigned. The lifecycle service
  // also validates ownership, but a 404-vs-403 distinction is more useful here.
  await assertDriverOwnsRide(driverId, rideId);

  let updated;

  switch (input.status) {
    case BookingStatus.DRIVER_ACCEPTED:
      updated = await rideLifecycle.acceptRide(driverId, rideId);
      break;
    case BookingStatus.DRIVER_REJECTED:
      updated = await rideLifecycle.declineRide(driverId, rideId);
      break;
    case BookingStatus.ARRIVED:
      updated = await rideLifecycle.markDriverArrived(driverId, rideId);
      break;
    case BookingStatus.ONGOING:
      if (!input.otp) {
        throw new ApiError(400, "otp is required to start the trip");
      }
      updated = await rideLifecycle.startTrip(driverId, rideId, input.otp);
      break;
    case BookingStatus.COMPLETION_PENDING_CONFIRMATION:
      updated = await rideLifecycle.driverCompleteTrip(driverId, rideId);
      break;
    case BookingStatus.CANCELLED_BY_DRIVER:
      updated = await rideLifecycle.driverCancelRide(driverId, rideId, input.reason);
      break;
    default:
      throw new ApiError(
        400,
        `Driver cannot transition a ride to "${input.status}". Allowed: ${DRIVER_ALLOWED_STATUSES.join(", ")}`,
      );
  }

  return {
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt,
    updatedAt: updated.updatedAt,
  };
};

// ────────────────────────────────────────────────────────────────────────────
// SSE: ride status stream
//
// The controller is responsible only for opening the response and forwarding
// it here. All Prisma access, polling cadence, and lifecycle of the stream
// (interval, max duration, cleanup on disconnect) are owned by the service.
// ────────────────────────────────────────────────────────────────────────────

const RIDE_STREAM_POLL_MS = 2_000;
const RIDE_STREAM_MAX_DURATION_MS = 30 * 60 * 1000;

interface RideStatusStreamOptions {
  /** Called when the underlying request is closed by the client. */
  onClientDisconnect: (handler: () => void) => void;
}

const fetchRideStatusSnapshot = (rideId: string) =>
  prisma.booking.findUnique({
    where: { id: rideId },
    select: { status: true, updatedAt: true },
  });

/**
 * Stream ride status changes over SSE for the given driver+ride pair.
 *
 * Verifies driver ownership, then writes a single SSE event per detected
 * status change. The stream auto-closes after `RIDE_STREAM_MAX_DURATION_MS`
 * or when the client disconnects.
 */
export const streamRideStatusForDriver = async (
  driverId: string,
  rideId: string,
  res: Response,
  options: RideStatusStreamOptions,
): Promise<void> => {
  const ownedRideId = await assertDriverOwnsRide(driverId, rideId);

  // CORS is handled at the app level; we only set the SSE-specific headers.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let lastStatus: BookingStatus | "" = "";

  const pushSnapshot = async (): Promise<void> => {
    try {
      const current = await fetchRideStatusSnapshot(ownedRideId);
      if (current && current.status !== lastStatus) {
        lastStatus = current.status;
        const payload = JSON.stringify({
          status: current.status,
          updatedAt: current.updatedAt,
        });
        res.write(`event: ride:status\ndata: ${payload}\n\n`);
      }
    } catch (err) {
      ridesLogger.error({ err, rideId: ownedRideId }, "SSE snapshot failed");
    }
  };

  await pushSnapshot();

  const interval = setInterval(pushSnapshot, RIDE_STREAM_POLL_MS);
  const timeout = setTimeout(() => {
    clearInterval(interval);
    res.end();
  }, RIDE_STREAM_MAX_DURATION_MS);

  options.onClientDisconnect(() => {
    clearInterval(interval);
    clearTimeout(timeout);
    res.end();
  });
};

import { Request, Response } from "express";

import * as ridesService from "../services/rides.service";
import type {
  ListDriverRidesQuery,
  UpdateRideStatusBody,
} from "../schemas/rides.schema";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";

/**
 * Controllers in this file MUST stay thin. Their only responsibilities are:
 *   1. Pull the authenticated user / params / body / query off the request
 *      (already validated by `validateRequest` middleware).
 *   2. Delegate to a service method.
 *   3. Forward the result via `sendSuccess`.
 *
 * No Prisma access, no ownership checks, no lifecycle/state-machine logic,
 * no business rules, no notifications, no transactions, no manual parsing.
 */

const requireDriverId = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }
  return req.user.id;
};

/** GET /api/v1/rides */
export const getDriverRides = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const query = req.query as unknown as ListDriverRidesQuery;

  const rides = await ridesService.listDriverRides(driverId, {
    ...(query.status !== undefined ? { status: query.status } : {}),
    limit: query.limit,
    offset: query.offset,
  });

  sendSuccess(res, "Rides fetched successfully", rides);
});

/** GET /api/v1/rides/:rideId */
export const getRideById = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const { rideId } = req.params as { rideId: string };
  const ride = await ridesService.getDriverRideById(driverId, rideId);
  sendSuccess(res, "Ride fetched successfully", ride);
});

/** PUT /api/v1/rides/:rideId/status */
export const updateRideStatus = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const { rideId } = req.params as { rideId: string };
  const body = req.body as UpdateRideStatusBody;

  const result = await ridesService.updateRideStatusByDriver(driverId, rideId, {
    status: body.status,
    ...(body.otp !== undefined ? { otp: body.otp } : {}),
    ...(body.reason !== undefined ? { reason: body.reason } : {}),
  });

  sendSuccess(res, "Ride status updated successfully", result);
});

/** GET /api/v1/rides/:rideId/status-stream */
export const streamRideStatus = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const { rideId } = req.params as { rideId: string };

  await ridesService.streamRideStatusForDriver(driverId, rideId, res, {
    onClientDisconnect: (handler) => req.on("close", handler),
  });
});

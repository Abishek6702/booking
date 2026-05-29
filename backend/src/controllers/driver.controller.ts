import { Request, Response } from "express";

import * as driverService from "../services/driver.service";
import type { UpdateDriverStatusInput } from "../schemas/driver.schema";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";

/**
 * Driver controller — thin orchestration layer.
 *
 * Responsibilities:
 *   1. Pull the authenticated driver id off the request.
 *   2. Pull validated body/params off the request (already parsed by
 *      `validateRequest` middleware).
 *   3. Delegate to the driver service.
 *   4. Forward the result via `sendSuccess`.
 *
 * No Prisma access, no cache busting, no business rules.
 */

const requireDriverId = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }
  return req.user.id;
};

/** GET /api/v1/driver/status */
export const getDriverStatus = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const result = await driverService.getDriverStatus(driverId);
  sendSuccess(res, "Driver status fetched", result);
});

/** PATCH /api/v1/driver/status */
export const updateDriverStatus = asyncHandler(async (req: Request, res: Response) => {
  const driverId = requireDriverId(req);
  const { isOnline } = req.body as UpdateDriverStatusInput;

  const result = await driverService.setDriverStatus(driverId, isOnline);

  sendSuccess(res, result.isOnline ? "You are now online" : "You are now offline", result);
});

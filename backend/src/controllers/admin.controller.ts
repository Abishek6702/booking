import { Request, Response } from "express";

import * as adminService from "../services/admin.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";

const adminLogger = getLogger("controllers.admin");

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

/**
 * Wraps an async function with a timeout. 
 * If it exceeds the limit, it returns the fallback or throws an error.
 */
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      adminLogger.warn({ timeoutMs }, "Admin query timed out, using fallback");
      resolve(fallback);
    }, timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutId!);
  return result;
};

const DEV_FALLBACK_STATS = { total: 0, users: [], stays: [], vehicles: [], bookings: [], owners: [], reviews: [], page: 1, limit: 10, totalPages: 0 };

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listUsers(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Admin users fetched successfully", data);
});

export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.getUserDetails(String(req.params.id));

  sendSuccess(res, "Admin user details fetched successfully", data);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.updateUserRole(adminId, String(req.params.id), req.body);

  sendSuccess(res, "Admin user role updated successfully", data);
});

export const listStays = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listStays(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Admin stays fetched successfully", data);
});

export const approveStay = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.approveStay(adminId, String(req.params.id));

  sendSuccess(res, "Stay approved successfully", data);
});

export const rejectStay = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.rejectStay(adminId, String(req.params.id), req.body);

  sendSuccess(res, "Stay rejected successfully", data);
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listVehicles(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Admin vehicles fetched successfully", data);
});

export const approveVehicle = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.approveVehicle(adminId, String(req.params.id));

  sendSuccess(res, "Vehicle approved successfully", data);
});

export const rejectVehicle = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.rejectVehicle(adminId, String(req.params.id), req.body);

  sendSuccess(res, "Vehicle rejected successfully", data);
});


export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listBookings(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Admin bookings fetched successfully", data);
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listReviews(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Admin reviews fetched successfully", data);
});

export const listPendingOwners = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await withTimeout(adminService.listPendingOwners(req.query), 5000, DEV_FALLBACK_STATS);

  sendSuccess(res, "Pending owner verifications fetched successfully", data);
});

export const approveOwnerVerification = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.approveOwnerVerification(adminId, String(req.params.id));

  sendSuccess(res, "Owner verification approved successfully", data);
});

export const rejectOwnerVerification = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.rejectOwnerVerification(adminId, String(req.params.id));

  sendSuccess(res, "Owner verification rejected successfully", data);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.deleteUser(String(req.params.id));

  sendSuccess(res, "User deleted successfully", data);
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.deleteReview(String(req.params.id));

  sendSuccess(res, "Review deleted successfully", data);
});

export const listSupportTickets = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.listSupportTickets(req.query);

  sendSuccess(res, "Admin support tickets fetched successfully", data);
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.listPayments(req.query);

  sendSuccess(res, "Admin payments fetched successfully", data);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.getStats();

  sendSuccess(res, "Admin platform stats fetched successfully", data);
});

export const approveOwner = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.approveOwner(adminId, String(req.params.id));

  sendSuccess(res, "Owner approved successfully", data);
});

export const approveDriver = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.approveDriver(adminId, String(req.params.id));

  sendSuccess(res, "Driver approved successfully", data);
});
export const rejectOwner = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.rejectOwner(adminId, String(req.params.id));

  sendSuccess(res, "Owner rejected successfully", data);
});

export const rejectDriver = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await adminService.rejectDriver(adminId, String(req.params.id));

  sendSuccess(res, "Driver rejected successfully", data);
});

export const listPendingDrivers = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const data = await adminService.listPendingDrivers(req.query);

  sendSuccess(res, "Pending driver verifications fetched successfully", data);
});

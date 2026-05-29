import { Request, Response } from "express";

import {
  CancelBookingInput,
  CreateBookingInput,
  getBookingByIdSchema,
  PreviewBookingInput,
  UpdateBookingInput,
} from "../schemas/bookings.schema";
import * as bookingsService from "../services/bookings.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const previewBooking = asyncHandler(async (req: Request, res: Response) => {
  const data = await bookingsService.previewBooking(req.body as PreviewBookingInput);

  sendSuccess(res, "Booking preview calculated", data);
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);

  if (!req.idempotencyKey) {
    throw new ApiError(400, "idempotencyKey header is required for booking creation");
  }

  const data = await bookingsService.createBooking(userId, req.body as CreateBookingInput, req.idempotencyKey);

  sendSuccess(res, "Booking created successfully", data, 201);
});

export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = getBookingByIdSchema.shape.params.parse(req.params);
  const data = await bookingsService.getBookingById(userId, id);

  sendSuccess(res, "Booking fetched successfully", data);
});

export const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = getBookingByIdSchema.shape.params.parse(req.params);
  const data = await bookingsService.updateBooking(userId, id, req.body as UpdateBookingInput);

  sendSuccess(res, "Booking updated successfully", data);
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = getBookingByIdSchema.shape.params.parse(req.params);
  const data = await bookingsService.cancelBooking(userId, id, req.body as CancelBookingInput | undefined);

  sendSuccess(res, "Booking cancelled successfully", data);
});

export const approveBooking = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = getBookingByIdSchema.shape.params.parse(req.params);
  const data = await bookingsService.approveBooking(userId, id);

  sendSuccess(res, "Booking approved successfully", data);
});

export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await bookingsService.getUserBookings(
    userId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "User bookings fetched successfully", data);
});

// ─── Ride-Hailing Lifecycle (Driver actions) ──────────────────────────────────

import * as rideLifecycle from "../services/ride-lifecycle.service";
import type {
  CustomerCancelRideBody,
  DriverCancelRideBody,
  StartRideBody,
} from "../schemas/rides.schema";

export const acceptRide = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.acceptRide(driverId, id);
  sendSuccess(res, "Ride accepted", data);
});

export const declineRide = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.declineRide(driverId, id);
  sendSuccess(res, "Ride declined", data);
});

export const markDriverArrived = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.markDriverArrived(driverId, id);
  sendSuccess(res, "Marked as arrived", data);
});

export const startTrip = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const { otp } = req.body as StartRideBody;
  const data = await rideLifecycle.startTrip(driverId, id, otp);
  sendSuccess(res, "Trip started", data);
});

export const completeTrip = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.driverCompleteTrip(driverId, id);
  sendSuccess(res, "Trip marked as complete. Awaiting customer confirmation.", data);
});

export const driverCancelRide = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const { reason } = (req.body ?? {}) as DriverCancelRideBody;
  const data = await rideLifecycle.driverCancelRide(driverId, id, reason);
  sendSuccess(res, "Ride cancelled by driver", data);
});

// ─── Ride-Hailing Lifecycle (Customer actions) ────────────────────────────────

export const customerConfirmCompletion = asyncHandler(async (req: Request, res: Response) => {
  const customerId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.customerConfirmCompletion(customerId, id);
  sendSuccess(res, "Trip completion confirmed. Proceed to payment.", data);
});

export const customerPayRide = asyncHandler(async (req: Request, res: Response) => {
  const customerId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.customerMarkRidePaid(customerId, id);
  sendSuccess(res, "Payment confirmed. Ride completed.", data);
});

export const customerReportIssue = asyncHandler(async (req: Request, res: Response) => {
  const customerId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await rideLifecycle.customerReportIssue(customerId, id);
  sendSuccess(res, "Issue reported. Trip reverted to in-progress for resolution.", data);
});

export const customerCancelRide = asyncHandler(async (req: Request, res: Response) => {
  const customerId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const { reason } = (req.body ?? {}) as CustomerCancelRideBody;
  const data = await rideLifecycle.customerCancelRide(customerId, id, reason);
  sendSuccess(res, "Ride cancelled", data);
});

export const getOwnerBookings = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await bookingsService.getOwnerBookings(
    ownerId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Owner bookings fetched successfully", data);
});

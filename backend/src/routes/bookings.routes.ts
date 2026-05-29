import { Router } from "express";
import { UserRole } from "@prisma/client";

import * as bookingsController from "../controllers/bookings.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBookingIdempotencyKey } from "../middlewares/idempotency.middleware";
import { bookingRateLimiter } from "../middlewares/rate-limit.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { requireVerifiedUser } from "../middlewares/verification.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  cancelBookingSchema,
  createBookingSchema,
  getBookingByIdSchema,
  previewBookingSchema,
  updateBookingSchema,
} from "../schemas/bookings.schema";
import {
  customerCancelRideSchema,
  driverCancelRideSchema,
  rideBookingIdParamSchema,
  startRideSchema,
} from "../schemas/rides.schema";

const router = Router();

router.use(authenticate);
router.use(bookingRateLimiter);

router.post("/preview", validateRequest(previewBookingSchema), bookingsController.previewBooking);
router.post(
  "/",
  requireVerifiedUser,
  requireBookingIdempotencyKey,
  validateRequest(createBookingSchema),
  bookingsController.createBooking,
);
router.get("/", bookingsController.getUserBookings);
router.get("/owner", requireRole(UserRole.OWNER), bookingsController.getOwnerBookings);
router.get("/:id", validateRequest(getBookingByIdSchema), bookingsController.getBookingById);
router.put("/:id", validateRequest(updateBookingSchema), bookingsController.updateBooking);
router.post("/:id/cancel", validateRequest(cancelBookingSchema), bookingsController.cancelBooking);
router.post("/:id/approve", requireRole(UserRole.OWNER), bookingsController.approveBooking);

// Ride-hailing lifecycle (driver actions)
router.post(
  "/:id/accept",
  requireRole(UserRole.OWNER),
  validateRequest(rideBookingIdParamSchema),
  bookingsController.acceptRide,
);
router.post(
  "/:id/decline",
  requireRole(UserRole.OWNER),
  validateRequest(rideBookingIdParamSchema),
  bookingsController.declineRide,
);
router.post(
  "/:id/arrived",
  requireRole(UserRole.OWNER),
  validateRequest(rideBookingIdParamSchema),
  bookingsController.markDriverArrived,
);
router.post(
  "/:id/start",
  requireRole(UserRole.OWNER),
  validateRequest(startRideSchema),
  bookingsController.startTrip,
);
router.post(
  "/:id/complete",
  requireRole(UserRole.OWNER),
  validateRequest(rideBookingIdParamSchema),
  bookingsController.completeTrip,
);
router.post(
  "/:id/driver-cancel",
  requireRole(UserRole.OWNER),
  validateRequest(driverCancelRideSchema),
  bookingsController.driverCancelRide,
);

// Ride-hailing lifecycle (customer actions)
router.post(
  "/:id/confirm-completion",
  validateRequest(rideBookingIdParamSchema),
  bookingsController.customerConfirmCompletion,
);
router.post(
  "/:id/pay",
  validateRequest(rideBookingIdParamSchema),
  bookingsController.customerPayRide,
);
router.post(
  "/:id/report-issue",
  validateRequest(rideBookingIdParamSchema),
  bookingsController.customerReportIssue,
);
router.post(
  "/:id/customer-cancel",
  validateRequest(customerCancelRideSchema),
  bookingsController.customerCancelRide,
);

export default router;

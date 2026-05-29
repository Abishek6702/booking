import { BookingStatus } from "@prisma/client";
import { z } from "zod";

/**
 * Validation schemas for every ride-hailing endpoint.
 *
 * Validation guarantees are SHAPE-LEVEL only:
 *   - field presence, type, format, length, enum membership
 *   - cross-field requirements that can be checked from the payload alone
 *     (e.g. OTP must be present when status === ONGOING)
 *
 * Anything that requires a database read or domain knowledge stays in the
 * service / lifecycle layer:
 *   - whether a state transition is legal
 *   - whether the actor owns the ride
 *   - whether an OTP value is correct
 *   - role / actor authorization
 *
 * Controllers consume these via `validateRequest(...)` middleware and trust
 * `req.body`, `req.params`, and `req.query` to be well-shaped.
 */

// ────────────────────────────────────────────────────────────────────────────
// Reusable primitives
// ────────────────────────────────────────────────────────────────────────────

const rideIdSchema = z.string().trim().min(1, "rideId is required");
const bookingIdSchema = z.string().trim().min(1, "id is required");
const otpFieldSchema = z
  .string()
  .trim()
  .min(1, "otp is required")
  .max(10, "otp is too long");
const reasonFieldSchema = z.string().trim().min(1).max(500);

const rideIdParam = z.object({
  rideId: rideIdSchema,
});

const bookingIdParam = z.object({
  id: bookingIdSchema,
});

/** Statuses a driver may set via `PUT /rides/:rideId/status`. */
const driverTargetStatusSchema = z.enum([
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_REJECTED,
  BookingStatus.ARRIVED,
  BookingStatus.ONGOING,
  BookingStatus.COMPLETION_PENDING_CONFIRMATION,
  BookingStatus.CANCELLED_BY_DRIVER,
]);

/** Statuses we accept as a list filter on `GET /rides`. */
const rideListStatusFilterSchema = z.enum([
  BookingStatus.PENDING,
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.ARRIVED,
  BookingStatus.ONGOING,
  BookingStatus.COMPLETION_PENDING_CONFIRMATION,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.PAID,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED_BY_CUSTOMER,
  BookingStatus.CANCELLED_BY_DRIVER,
  BookingStatus.DRIVER_REJECTED,
  BookingStatus.EXPIRED,
]);

// ────────────────────────────────────────────────────────────────────────────
// `/rides` (driver-scoped) endpoints
// ────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/rides — list with optional status filter + pagination. */
export const listDriverRidesSchema = z.object({
  query: z.object({
    status: rideListStatusFilterSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

/** GET /api/v1/rides/:rideId */
export const rideIdParamsSchema = z.object({
  params: rideIdParam,
});

/** PUT /api/v1/rides/:rideId/status */
export const updateRideStatusSchema = z.object({
  params: rideIdParam,
  body: z
    .object({
      status: driverTargetStatusSchema,
      otp: otpFieldSchema.optional(),
      reason: reasonFieldSchema.optional(),
    })
    .superRefine((value, ctx) => {
      // OTP must accompany the trip-start transition (correctness checked in service)
      if (value.status === BookingStatus.ONGOING && !value.otp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otp"],
          message: "otp is required to start the trip",
        });
      }
      // Cancel transitions accept an optional human-readable reason. No more
      // body-level rules to enforce.
    }),
});

/** GET /api/v1/rides/:rideId/status-stream */
export const rideStatusStreamSchema = rideIdParamsSchema;

// ────────────────────────────────────────────────────────────────────────────
// `/bookings/:id/...` ride lifecycle endpoints
//
// These live on the bookings router today but operate on the ride lifecycle.
// We validate the booking id param plus any payload fields they accept.
// ────────────────────────────────────────────────────────────────────────────

/** Params-only schema for endpoints that take no body. */
export const rideBookingIdParamSchema = z.object({
  params: bookingIdParam,
});

/** POST /bookings/:id/start — driver starts the trip with the customer's OTP. */
export const startRideSchema = z.object({
  params: bookingIdParam,
  body: z.object({
    otp: otpFieldSchema,
  }),
});

/** POST /bookings/:id/driver-cancel */
export const driverCancelRideSchema = z.object({
  params: bookingIdParam,
  body: z
    .object({
      reason: reasonFieldSchema.optional(),
    })
    .optional()
    .default({}),
});

/** POST /bookings/:id/customer-cancel */
export const customerCancelRideSchema = z.object({
  params: bookingIdParam,
  body: z
    .object({
      reason: reasonFieldSchema.optional(),
    })
    .optional()
    .default({}),
});

// ────────────────────────────────────────────────────────────────────────────
// Inferred types — controllers import these instead of touching `req.body` raw
// ────────────────────────────────────────────────────────────────────────────

export type ListDriverRidesQuery = z.infer<typeof listDriverRidesSchema>["query"];
export type UpdateRideStatusBody = z.infer<typeof updateRideStatusSchema>["body"];
export type StartRideBody = z.infer<typeof startRideSchema>["body"];
export type DriverCancelRideBody = z.infer<typeof driverCancelRideSchema>["body"];
export type CustomerCancelRideBody = z.infer<typeof customerCancelRideSchema>["body"];

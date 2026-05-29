import { z } from "zod";

const isoDateTimeSchema = z.string().datetime({ offset: true });
const bookingTypeSchema = z.enum(["stay", "vehicle", "attraction"]);
const vehicleServiceModeSchema = z.literal("ride_hailing");
const vehicleDistanceKmSchema = z.coerce.number().positive().max(2000);
const vehicleDurationHoursSchema = z.coerce.number().nonnegative().max(72);
const distanceSchema = z.coerce.number().positive().max(2000);
const guestsSchema = z
  .record(z.number().int().min(0).max(1000))
  .refine((value) => Object.keys(value).length > 0, {
    message: "guests must include at least one guest category",
  })
  .refine((value) => Object.values(value).some((count) => count > 0), {
    message: "Total guests must be at least 1",
  });

const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

const noPastDateRangeRefine = (
  input: { checkIn: string; checkOut: string },
  ctx: z.RefinementCtx,
): void => {
  const checkInDate = new Date(input.checkIn);
  const checkOutDate = new Date(input.checkOut);
  const now = new Date();

  const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
  if (checkInDate.getTime() < now.getTime() - GRACE_PERIOD_MS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkIn"],
      message: "checkIn cannot be in the past",
    });
  }

  if (checkOutDate.getTime() < now.getTime() - GRACE_PERIOD_MS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkOut"],
      message: "checkOut cannot be in the past",
    });
  }

  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkOut"],
      message: "checkOut must be greater than checkIn",
    });
  }
};

const createLikePayloadSchema = z
  .object({
    type: bookingTypeSchema.optional().default("stay"),
    stayId: z.string().trim().min(1).optional(),
    roomId: z.string().trim().min(1).optional(),
    vehicleId: z.string().trim().min(1).optional(),
    vehicleServiceMode: vehicleServiceModeSchema.optional(),
    pickupAddress: z.string().trim().min(3).max(500).optional(),
    dropoffAddress: z.string().trim().min(3).max(500).optional(),
    pickupLocation: z.string().trim().min(3).max(500).optional(),
    dropLocation: z.string().trim().min(3).max(500).optional(),
    vehicleDistanceKm: vehicleDistanceKmSchema.optional(),
    distance: distanceSchema.optional(),
    vehicleDurationHours: vehicleDurationHoursSchema.optional(),
    attractionId: z.string().trim().min(1).optional(),
    slotId: z.string().trim().min(1).optional(),
    checkIn: isoDateTimeSchema.optional(),
    checkOut: isoDateTimeSchema.optional(),
    startTime: isoDateTimeSchema.optional(),
    endTime: isoDateTimeSchema.optional(),
    guests: guestsSchema,
    guestDetails: z.unknown(),
  })
  .superRefine((value, ctx) => {
    const type = value.type ?? "stay";
    const effectiveCheckIn = value.checkIn ?? value.startTime;
    const effectiveCheckOut = value.checkOut ?? value.endTime;
    const checkInPresent = Boolean(effectiveCheckIn);
    const checkOutPresent = Boolean(effectiveCheckOut);
    const isSlotAttractionFlow = type === "attraction" && Boolean(value.slotId);

    if (!isSlotAttractionFlow) {
      if (!effectiveCheckIn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkIn"],
          message: "checkIn is required",
        });
      }

      if (!effectiveCheckOut) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkOut"],
          message: "checkOut is required",
        });
      }
    } else if (checkInPresent !== checkOutPresent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkIn"],
        message: "checkIn and checkOut must be provided together when set",
      });
    }

    if (effectiveCheckIn && effectiveCheckOut) {
      noPastDateRangeRefine({ checkIn: effectiveCheckIn, checkOut: effectiveCheckOut }, ctx);
    }

    if (type === "stay") {
      if (!value.stayId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stayId"],
          message: "stayId is required for stay booking",
        });
      }

      if (!value.roomId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roomId"],
          message: "roomId is required for stay booking",
        });
      }

      if (
        value.vehicleId ||
        value.vehicleServiceMode ||
        value.pickupAddress ||
        value.dropoffAddress ||
        value.pickupLocation ||
        value.dropLocation ||
        value.vehicleDistanceKm !== undefined ||
        value.distance !== undefined ||
        value.vehicleDurationHours !== undefined ||
        value.attractionId ||
        value.slotId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message:
            "vehicle fields and attraction fields are not allowed for stay booking",
        });
      }

      return;
    }

    if (type === "vehicle") {
      const pickup = value.pickupAddress ?? value.pickupLocation;
      const drop = value.dropoffAddress ?? value.dropLocation;
      const distance = value.vehicleDistanceKm ?? value.distance;

      if (!value.vehicleId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vehicleId"],
          message: "vehicleId is required for vehicle booking",
        });
      }

      if (value.roomId || value.stayId || value.attractionId || value.slotId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: "roomId, stayId, attractionId and slotId are not allowed for vehicle booking",
        });
      }

      if (distance === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["distance"],
          message: "distance is required for vehicle booking",
        });
      }

      if ((pickup && !drop) || (!pickup && drop)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupAddress"],
          message: "pickupLocation and dropLocation must be provided together",
        });
      }

      if (!pickup || !drop) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupAddress"],
          message: "pickupLocation and dropLocation are required for vehicle booking",
        });
      }

      return;
    }

    if (!value.attractionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attractionId"],
        message: "attractionId is required for attraction booking",
      });
    }

    if (!value.slotId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slotId"],
        message: "slotId is required for attraction booking",
      });
    }

    if (
      value.roomId ||
      value.stayId ||
      value.vehicleId ||
      value.vehicleServiceMode ||
      value.pickupAddress ||
      value.dropoffAddress ||
      value.pickupLocation ||
      value.dropLocation ||
      value.vehicleDistanceKm !== undefined ||
      value.distance !== undefined ||
      value.vehicleDurationHours !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message:
          "vehicle fields are not allowed for attraction booking",
      });
    }
  });

export const previewBookingSchema = z.object({
  body: createLikePayloadSchema,
});

export const createBookingSchema = z.object({
  body: createLikePayloadSchema,
});

export const getBookingByIdSchema = bookingIdParamSchema;

export const updateBookingSchema = z
  .object({
    params: z.object({
      id: z.string().trim().min(1),
    }),
    body: z
      .object({
        type: bookingTypeSchema.optional(),
        stayId: z.string().trim().min(1).optional(),
        roomId: z.string().trim().min(1).optional(),
        vehicleId: z.string().trim().min(1).optional(),
        vehicleServiceMode: vehicleServiceModeSchema.optional(),
        pickupAddress: z.string().trim().min(3).max(500).optional(),
        dropoffAddress: z.string().trim().min(3).max(500).optional(),
        pickupLocation: z.string().trim().min(3).max(500).optional(),
        dropLocation: z.string().trim().min(3).max(500).optional(),
        vehicleDistanceKm: vehicleDistanceKmSchema.optional(),
        distance: distanceSchema.optional(),
        vehicleDurationHours: vehicleDurationHoursSchema.optional(),
        attractionId: z.string().trim().min(1).optional(),
        slotId: z.string().trim().min(1).optional(),
        checkIn: isoDateTimeSchema.optional(),
        checkOut: isoDateTimeSchema.optional(),
        startTime: isoDateTimeSchema.optional(),
        endTime: isoDateTimeSchema.optional(),
        guests: guestsSchema.optional(),
        guestDetails: z.unknown().optional(),
        // NOTE: status is intentionally excluded. Booking confirmation is only allowed
        // through the payment flow (POST /payments/process). Direct status manipulation
        // via update would bypass payment validation entirely.
      })
      .superRefine((value, ctx) => {
        const effectiveCheckIn = value.checkIn ?? value.startTime;
        const effectiveCheckOut = value.checkOut ?? value.endTime;
        const checkInPresent = Boolean(effectiveCheckIn);
        const checkOutPresent = Boolean(effectiveCheckOut);

        if (checkInPresent !== checkOutPresent) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["checkIn"],
            message: "checkIn and checkOut must be provided together",
          });
        }

        if (effectiveCheckIn && effectiveCheckOut) {
          noPastDateRangeRefine({ checkIn: effectiveCheckIn, checkOut: effectiveCheckOut }, ctx);
        }

        if (
          value.type === "stay" &&
          (
            value.vehicleId ||
            value.vehicleServiceMode ||
            value.pickupAddress ||
            value.dropoffAddress ||
            value.pickupLocation ||
            value.dropLocation ||
            value.vehicleDistanceKm !== undefined ||
            value.distance !== undefined ||
            value.vehicleDurationHours !== undefined ||
            value.attractionId ||
            value.slotId
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["type"],
            message:
              "vehicle fields and attraction fields are not allowed for stay booking",
          });
        }

        if (
          value.type === "vehicle" &&
          (value.roomId || value.stayId || value.attractionId || value.slotId)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["type"],
            message: "roomId, stayId, attractionId and slotId are not allowed for vehicle booking",
          });
        }

        const pickup = value.pickupAddress ?? value.pickupLocation;
        const drop = value.dropoffAddress ?? value.dropLocation;
        const distance = value.vehicleDistanceKm ?? value.distance;

        if ((pickup && !drop) || (!pickup && drop)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pickupAddress"],
            message: "pickupLocation and dropLocation must be provided together",
          });
        }

        if (value.type === "vehicle") {
          if (distance === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["distance"],
              message: "distance is required for vehicle booking",
            });
          }

          if (!pickup || !drop) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["pickupAddress"],
              message: "pickupLocation and dropLocation are required for vehicle booking",
            });
          }
        }

        if (
          value.type === "attraction" &&
          (
            value.roomId ||
            value.stayId ||
            value.vehicleId ||
            value.vehicleServiceMode ||
            value.pickupAddress ||
            value.dropoffAddress ||
            value.pickupLocation ||
            value.dropLocation ||
            value.vehicleDistanceKm !== undefined ||
            value.distance !== undefined ||
            value.vehicleDurationHours !== undefined
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["type"],
            message:
              "vehicle fields are not allowed for attraction booking",
          });
        }
      })
      .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field is required for update",
      }),
  });

export const cancelBookingSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      reason: z.string().trim().min(1).max(500).optional(),
    })
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>["body"];
export type PreviewBookingInput = z.infer<typeof previewBookingSchema>["body"];
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>["body"];
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>["body"];

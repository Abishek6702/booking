import { z } from "zod";

const isoDateTimeSchema = z.string().datetime({ offset: true });
const vehicleTypeSchema = z.enum(["car", "bike", "van"]);

const noPastDateRangeRefine = (
  input: { checkIn: string; checkOut: string },
  ctx: z.RefinementCtx,
): void => {
  const checkInDate = new Date(input.checkIn);
  const checkOutDate = new Date(input.checkOut);
  const now = new Date();

  if (checkInDate.getTime() < now.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["checkIn"],
      message: "checkIn cannot be in the past",
    });
  }

  if (checkOutDate.getTime() < now.getTime()) {
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

const createVehicleBodySchema = z.object({
  type: vehicleTypeSchema,
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  seats: z.coerce.number().int().min(1).max(20),
  pricePerKm: z.coerce.number().positive(),
  images: z.array(z.string().trim().url()).max(20).optional().default([]),
  isActive: z.coerce.boolean().optional().default(true),
  city: z.string().trim().min(1).max(100).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

const updateVehicleBodySchema = createVehicleBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const searchVehiclesSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    type: vehicleTypeSchema.optional(),
    minSeats: z.coerce.number().int().min(1).optional(),
    maxSeats: z.coerce.number().int().min(1).optional(),
    minPricePerKm: z.coerce.number().nonnegative().optional(),
    maxPricePerKm: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const vehicleIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const createVehicleSchema = z.object({
  body: createVehicleBodySchema,
});

export const updateVehicleSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: updateVehicleBodySchema,
});

export const vehicleAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z
    .object({
      checkIn: isoDateTimeSchema,
      checkOut: isoDateTimeSchema,
    })
    .superRefine(noPastDateRangeRefine),
});

export const featuredVehiclesQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
});

export const vehicleReviewsQuerySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const updateVehicleLocationSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    address: z.string().trim().min(1),
  }),
});

export type SearchVehiclesInput = z.infer<typeof searchVehiclesSchema>["query"];
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>["body"];
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>["body"];
export type VehicleAvailabilityQueryInput = z.infer<typeof vehicleAvailabilitySchema>["query"];
export type FeaturedVehiclesQueryInput = z.infer<typeof featuredVehiclesQuerySchema>["query"];
export type VehicleReviewsQueryInput = z.infer<typeof vehicleReviewsQuerySchema>["query"];
export type UpdateVehicleLocationInput = z.infer<typeof updateVehicleLocationSchema>["body"];

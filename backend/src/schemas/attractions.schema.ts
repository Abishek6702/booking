import { z } from "zod";

const isoDateTimeSchema = z.string().datetime({ offset: true });
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format");
const hhmmTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be in HH:mm format");

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

const createAttractionBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  type: z.string().trim().min(1).max(100),
  price: z.coerce.number().nonnegative(),
  images: z.array(z.string().trim().url()).max(20).optional().default([]),
  location: z.record(z.unknown()),
});

const updateAttractionBodySchema = createAttractionBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const searchAttractionsSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const attractionIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const createAttractionSchema = z.object({
  body: createAttractionBodySchema,
});

export const updateAttractionSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: updateAttractionBodySchema,
});

export const attractionAvailabilitySchema = z.object({
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

export const createAttractionSlotSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      date: localDateSchema,
      startTime: hhmmTimeSchema,
      endTime: hhmmTimeSchema,
      capacity: z.coerce.number().int().min(1).max(1000),
    })
    .superRefine((value, ctx) => {
      if (value.endTime <= value.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "endTime must be greater than startTime",
        });
      }
    }),
});

export const updateAttractionSlotSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    slotId: z.string().trim().min(1),
  }),
  body: z
    .object({
      date: localDateSchema.optional(),
      startTime: hhmmTimeSchema.optional(),
      endTime: hhmmTimeSchema.optional(),
      capacity: z.coerce.number().int().min(1).max(1000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one slot field is required for update",
    })
    .superRefine((value, ctx) => {
      if (value.startTime && value.endTime && value.endTime <= value.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "endTime must be greater than startTime",
        });
      }
    }),
});

export const deleteAttractionSlotSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    slotId: z.string().trim().min(1),
  }),
});

export const getAttractionSlotsSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({
    date: localDateSchema.optional(),
  }),
});

export const featuredAttractionsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
});

export const attractionReviewsQuerySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const toggleSlotStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
    slotId: z.string().trim().min(1),
  }),
});

export type SearchAttractionsInput = z.infer<typeof searchAttractionsSchema>["query"];
export type CreateAttractionInput = z.infer<typeof createAttractionSchema>["body"];
export type UpdateAttractionInput = z.infer<typeof updateAttractionSchema>["body"];
export type AttractionAvailabilityQueryInput = z.infer<typeof attractionAvailabilitySchema>["query"];
export type CreateAttractionSlotInput = z.infer<typeof createAttractionSlotSchema>["body"];
export type UpdateAttractionSlotInput = z.infer<typeof updateAttractionSlotSchema>["body"];
export type GetAttractionSlotsQueryInput = z.infer<typeof getAttractionSlotsSchema>["query"];
export type FeaturedAttractionsQueryInput = z.infer<typeof featuredAttractionsQuerySchema>["query"];
export type AttractionReviewsQueryInput = z.infer<typeof attractionReviewsQuerySchema>["query"];

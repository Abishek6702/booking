import { z } from "zod";

const stayTypeSchema = z.enum(["hotel", "apartment", "villa"]);

const createStayBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  type: stayTypeSchema,
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(255),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  images: z.array(z.string().trim().url()).max(20).optional().default([]),
  amenities: z.array(z.string().trim().min(1)),
  policies: z.record(z.unknown()),
});

const updateStayBodySchema = createStayBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const searchStaysSchema = z.object({
  query: z.object({
    city: z.string().trim().min(1).optional(),
    type: stayTypeSchema.optional().or(z.literal("RESORT")),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.string().optional(),
    sortBy: z.enum(["recommended", "price-low", "price-high"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const stayIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const createOwnerStaySchema = z.object({
  body: createStayBodySchema,
});

export const updateStaySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: updateStayBodySchema,
});

export const featuredStaysQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
});

export const stayReviewsQuerySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export type SearchStaysInput = z.infer<typeof searchStaysSchema>["query"];
export type CreateOwnerStayInput = z.infer<typeof createOwnerStaySchema>["body"];
export type UpdateStayInput = z.infer<typeof updateStaySchema>["body"];
export type FeaturedStaysQueryInput = z.infer<typeof featuredStaysQuerySchema>["query"];
export type StayReviewsQueryInput = z.infer<typeof stayReviewsQuerySchema>["query"];

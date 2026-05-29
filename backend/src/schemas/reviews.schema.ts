import { z } from "zod";

const itemTypeSchema = z.enum(["stay", "vehicle", "attraction"]);

export const createReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().trim().min(1),
    itemId: z.string().trim().min(1),
    itemType: itemTypeSchema,
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().min(1).max(150),
    comment: z.string().trim().min(1).max(2000),
  }),
});

export const getReviewsSchema = z.object({
  query: z.object({
    itemId: z.string().trim().min(1),
    itemType: itemTypeSchema,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const reviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      rating: z.coerce.number().int().min(1).max(5).optional(),
      title: z.string().trim().min(1).max(150).optional(),
      comment: z.string().trim().min(1).max(2000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required for update",
    }),
});

export const markHelpfulSchema = reviewIdParamSchema;

export const reportReviewSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    reason: z.string().trim().min(5).max(500),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>["body"];
export type GetReviewsQueryInput = z.infer<typeof getReviewsSchema>["query"];
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>["body"];
export type ReportReviewInput = z.infer<typeof reportReviewSchema>["body"];

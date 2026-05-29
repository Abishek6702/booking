import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      phone: z.union([z.string().trim().min(7).max(20), z.null()]).optional(),
    })
    .refine((value) => value.name !== undefined || value.phone !== undefined, {
      message: "At least one field (name or phone) must be provided",
    }),
});

export const profileBookingsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const toggleFavoriteSchema = z.object({
  body: z.object({
    itemId: z.string().trim().min(1),
    itemType: z.enum(["stay", "vehicle", "attraction"]),
  }),
});

export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().url().max(500),
  }),
});

export const applyDriverSchema = z.object({
  body: z.object({}).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type ProfileBookingsQueryInput = z.infer<typeof profileBookingsQuerySchema>["query"];
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>["body"];
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>["body"];
export type ApplyDriverInput = z.infer<typeof applyDriverSchema>["body"];

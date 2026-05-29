import { z } from "zod";

/**
 * Schemas for `/api/v1/driver/*` endpoints.
 *
 * Vehicle CRUD validation continues to live in `vehicles.schema.ts` and is
 * re-exported below for the routes file to keep imports tidy.
 */

export const updateDriverStatusSchema = z.object({
  body: z.object({
    isOnline: z.boolean({
      required_error: "isOnline is required",
      invalid_type_error: "isOnline must be a boolean",
    }),
  }),
});

export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusSchema>["body"];

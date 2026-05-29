import { z } from "zod";

export const submitOwnerVerificationSchema = z.object({
  body: z.object({
    documents: z.array(z.string().trim().url()).min(1).max(10),
  }),
});

export type SubmitOwnerVerificationInput = z.infer<typeof submitOwnerVerificationSchema>["body"];

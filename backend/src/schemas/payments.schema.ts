import { z } from "zod";

export const processPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().trim().min(1),
    paymentMethod: z.string().trim().min(1).max(100),
    currency: z.string().trim().length(3).optional().default("USD"),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const refundPaymentSchema = paymentIdParamSchema;

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>["body"];

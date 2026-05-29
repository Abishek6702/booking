import { Router } from "express";
import { z } from "zod";

import * as availabilityController from "../controllers/availability.controller";
import { validateRequest } from "../middlewares/validation.middleware";

const availabilityRequestSchema = z
  .object({
    params: z.object({
      id: z.string().trim().min(1),
    }),
    query: z.object({
      checkIn: z.string().datetime({ offset: true }),
      checkOut: z.string().datetime({ offset: true }),
    }),
  })
  .superRefine(({ query }, ctx) => {
    const now = new Date();
    const checkInDate = new Date(query.checkIn);
    const checkOutDate = new Date(query.checkOut);

    if (checkInDate.getTime() < now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "checkIn"],
        message: "checkIn cannot be in the past",
      });
    }

    if (checkOutDate.getTime() < now.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "checkOut"],
        message: "checkOut cannot be in the past",
      });
    }

    if (checkOutDate.getTime() <= checkInDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "checkOut"],
        message: "checkOut must be greater than checkIn",
      });
    }
  });

const router = Router();

router.get(
  "/:id/availability",
  validateRequest(availabilityRequestSchema),
  availabilityController.getStayAvailability,
);

export default router;

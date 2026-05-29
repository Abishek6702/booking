import { Request, Response } from "express";

import { paymentIdParamSchema, ProcessPaymentInput } from "../schemas/payments.schema";
import * as paymentsService from "../services/payments.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await paymentsService.processPayment(userId, req.body as ProcessPaymentInput);

  sendSuccess(res, "Payment processed successfully", data, 201);
});

export const getUserPayments = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await paymentsService.getUserPayments(
    userId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Payment history fetched successfully", data);
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = paymentIdParamSchema.shape.params.parse(req.params);
  const data = await paymentsService.getPaymentById(userId, id);

  sendSuccess(res, "Payment fetched successfully", data);
});

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = paymentIdParamSchema.shape.params.parse(req.params);
  const data = await paymentsService.requestRefund(userId, id);

  sendSuccess(res, "Refund requested successfully", data);
});

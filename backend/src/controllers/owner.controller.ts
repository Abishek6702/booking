import { Request, Response } from "express";

import { SubmitOwnerVerificationInput } from "../schemas/owner.schema";
import * as ownerService from "../services/owner.service";
import * as reviewsService from "../services/reviews.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

const getParamOrThrow = (value: string | string[] | undefined, message: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, message);
  }

  return value;
};

export const getOwnerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await ownerService.getOwnerDashboard(ownerId);

  sendSuccess(res, "Owner dashboard fetched successfully", data);
});

export const getOwnerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await ownerService.getOwnerAnalytics(ownerId);

  sendSuccess(res, "Owner analytics fetched successfully", data);
});

export const submitOwnerVerification = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await ownerService.submitOwnerVerification(
    ownerId,
    req.body as SubmitOwnerVerificationInput,
  );

  sendSuccess(res, "Owner verification submitted successfully", data);
});

export const getOwnerStatus = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await ownerService.getOwnerStatus(ownerId);

  sendSuccess(res, "Owner status fetched successfully", data);
});

export const getOwnerReviews = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await reviewsService.getOwnerReviews(
    ownerId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Owner reviews fetched successfully", data);
});

export const replyToReview = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const reviewId = getParamOrThrow(req.params.id, "Invalid review id");
  const { reply } = req.body as { reply?: string };

  if (!reply) {
    throw new ApiError(400, "Reply text is required");
  }

  const data = await reviewsService.replyToReview(ownerId, reviewId, reply);

  sendSuccess(res, "Reply submitted successfully", data);
});

// DEV-ONLY: Instantly approve owner verification for testing
export const devApproveOwner = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await ownerService.devApproveOwner(ownerId);

  sendSuccess(res, "Owner approved successfully (dev mode)", data);
});

// DEV-ONLY: Instantly approve a stay listing moderation for testing
export const devApproveStay = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const stayId = getParamOrThrow(req.params.stayId, "Invalid stay id");

  const data = await ownerService.devApproveStay(ownerId, stayId);

  sendSuccess(res, "Stay approved successfully (dev mode)", data);
});

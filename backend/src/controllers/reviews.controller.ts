import { Request, Response } from "express";

import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";
import {
  CreateReviewInput,
  getReviewsSchema,
  GetReviewsQueryInput,
  reviewIdParamSchema,
  UpdateReviewInput,
  ReportReviewInput,
} from "../schemas/reviews.schema";
import * as reviewsService from "../services/reviews.service";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await reviewsService.createReview(userId, req.body as CreateReviewInput);

  sendSuccess(res, "Review created successfully", data, 201);
});

export const getReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = getReviewsSchema.shape.query.parse(req.query) as GetReviewsQueryInput;
  const data = await reviewsService.getReviewsByItem(query);

  sendSuccess(res, "Reviews fetched successfully", data);
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = reviewIdParamSchema.shape.params.parse(req.params);
  const data = await reviewsService.updateReview(userId, id, req.body as UpdateReviewInput);

  sendSuccess(res, "Review updated successfully", data);
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const { id } = reviewIdParamSchema.shape.params.parse(req.params);
  const data = await reviewsService.deleteReview(userId, id);

  sendSuccess(res, "Review deleted successfully", data);
});

export const markHelpful = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const { id } = reviewIdParamSchema.shape.params.parse(req.params);
  const data = await reviewsService.markReviewHelpful(id);

  sendSuccess(res, "Review marked as helpful", data);
});

export const getReview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = reviewIdParamSchema.shape.params.parse(req.params);
  const data = await reviewsService.getReview(id);

  sendSuccess(res, "Review fetched successfully", data);
});

export const getMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await reviewsService.getMyReviews(
    userId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Your reviews fetched successfully", data);
});

export const reportReview = asyncHandler(async (req: Request, res: Response) => {
  getUserIdOrThrow(req);
  const { id } = reviewIdParamSchema.shape.params.parse(req.params);
  const data = await reviewsService.reportReview(id, req.body as ReportReviewInput);

  sendSuccess(res, "Review reported successfully", data);
});

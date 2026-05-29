import { Request, Response } from "express";

import {
  CreateOwnerStayInput,
  searchStaysSchema,
  stayIdParamSchema,
  UpdateStayInput,
  featuredStaysQuerySchema,
  stayReviewsQuerySchema,
} from "../schemas/stays.schema";
import * as staysService from "../services/stays.service";
import * as reviewsService from "../services/reviews.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const searchStays = asyncHandler(async (req: Request, res: Response) => {
  const query = searchStaysSchema.shape.query.parse(req.query);
  const data = await staysService.searchStays(query);

  sendSuccess(res, "Stays fetched successfully", data);
});

export const getStayDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = stayIdParamSchema.shape.params.parse(req.params);
  const userId = req.user?.id;
  const data = await staysService.getStayById(id, userId);

  sendSuccess(res, "Stay details fetched successfully", data);
});

export const getOwnerProperties = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await staysService.getOwnerProperties(
    ownerId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Owner properties fetched successfully", data);
});

export const createOwnerProperty = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const data = await staysService.createOwnerProperty(ownerId, req.body as CreateOwnerStayInput);

  sendSuccess(res, "Stay created successfully", data, 201);
});

export const updateStay = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id } = stayIdParamSchema.shape.params.parse(req.params);
  const data = await staysService.updateOwnerProperty(ownerId, id, req.body as UpdateStayInput);

  sendSuccess(res, "Stay updated successfully", data);
});

export const deleteStay = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id } = stayIdParamSchema.shape.params.parse(req.params);
  const data = await staysService.deleteOwnerProperty(ownerId, id);

  sendSuccess(res, "Stay deleted successfully", data);
});

export const getFeaturedStays = asyncHandler(async (req: Request, res: Response) => {
  const query = featuredStaysQuerySchema.shape.query.parse(req.query);
  const data = await staysService.getFeaturedStays(query.limit);

  sendSuccess(res, "Featured stays fetched successfully", data);
});

export const getStayReviews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = stayReviewsQuerySchema.shape.params.parse(req.params);
  const query = stayReviewsQuerySchema.shape.query.parse(req.query);
  
  const data = await reviewsService.getReviewsByItem({
    itemId: id,
    itemType: "stay",
    page: query.page,
    limit: query.limit,
  });

  sendSuccess(res, "Stay reviews fetched successfully", data);
});

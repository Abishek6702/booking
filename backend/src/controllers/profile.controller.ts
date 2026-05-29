import { Request, Response } from "express";

import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";
import {
  profileBookingsQuerySchema,
  ToggleFavoriteInput,
  UpdateProfileInput,
  UpdateAvatarInput,
} from "../schemas/profile.schema";
import * as profileService from "../services/profile.service";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const profile = await profileService.getProfile(userId);

  sendSuccess(res, "Profile fetched successfully", profile);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const profile = await profileService.updateProfile(userId, req.body as UpdateProfileInput);

  sendSuccess(res, "Profile updated successfully", profile);
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const profile = await profileService.updateAvatar(userId, req.body as UpdateAvatarInput);

  sendSuccess(res, "Avatar updated successfully", profile);
});

export const getMyBookings = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const query = profileBookingsQuerySchema.shape.query.parse(req.query);
  const data = await profileService.getMyBookings(userId, query);

  sendSuccess(res, "Bookings fetched successfully", data);
});

export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await profileService.toggleFavorite(userId, req.body as ToggleFavoriteInput);

  sendSuccess(res, "Favorite updated successfully", data);
});

export const getMyFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const favorites = await profileService.getMyFavorites(
    userId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Favorites fetched successfully", favorites);
});

export const getMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const reviews = await profileService.getMyReviews(userId);

  sendSuccess(res, "Reviews fetched successfully", reviews);
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  await profileService.deleteAccount(userId);

  sendSuccess(res, "Account deleted successfully", {});
});

export const applyAsDriver = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const profile = await profileService.applyAsDriver(userId);

  sendSuccess(res, "Driver application submitted", profile);
});

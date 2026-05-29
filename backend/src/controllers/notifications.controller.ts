import { Request, Response } from "express";

import * as notificationService from "../services/notification.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }
  return req.user.id;
};

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await notificationService.listUserNotifications(
    userId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Notifications fetched", data);
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const id = String(req.params.id);
  const data = await notificationService.markNotificationRead(userId, id);

  sendSuccess(res, "Notification marked as read", data);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdOrThrow(req);
  const data = await notificationService.markAllNotificationsRead(userId);

  sendSuccess(res, "All notifications marked as read", data);
});

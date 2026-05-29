import { Request, Response } from "express";

import { CreateRoomInput, stayParamSchema, stayRoomParamSchema, UpdateRoomInput, roomAvailabilitySchema } from "../schemas/rooms.schema";
import * as roomsService from "../services/rooms.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const getStayRooms = asyncHandler(async (req: Request, res: Response) => {
  const { id } = stayParamSchema.shape.params.parse(req.params);
  const viewerId = req.user?.id;
  const data = await roomsService.getStayRooms(id, viewerId);

  sendSuccess(res, "Rooms fetched successfully", data);
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id, roomId } = stayRoomParamSchema.shape.params.parse(req.params);
  const data = await roomsService.getRoom(id, roomId);

  sendSuccess(res, "Room fetched successfully", data);
});

export const getRoomAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id, roomId } = roomAvailabilitySchema.shape.params.parse(req.params);
  const query = roomAvailabilitySchema.shape.query.parse(req.query);
  const data = await roomsService.getRoomAvailability(id, roomId, query);

  sendSuccess(res, "Room availability fetched successfully", data);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id } = stayParamSchema.shape.params.parse(req.params);
  const data = await roomsService.createRoom(ownerId, id, req.body as CreateRoomInput);

  sendSuccess(res, "Room created successfully", data, 201);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id, roomId } = stayRoomParamSchema.shape.params.parse(req.params);
  const data = await roomsService.updateRoom(ownerId, id, roomId, req.body as UpdateRoomInput);

  sendSuccess(res, "Room updated successfully", data);
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id, roomId } = stayRoomParamSchema.shape.params.parse(req.params);
  const data = await roomsService.deleteRoom(ownerId, id, roomId);

  sendSuccess(res, "Room deleted successfully", data);
});

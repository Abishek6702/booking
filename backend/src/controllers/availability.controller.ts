import { Request, Response } from "express";

import * as availabilityService from "../services/availability.service";
import { asyncHandler, sendSuccess } from "../utils/error.util";

export const getStayAvailability = asyncHandler(async (req: Request, res: Response) => {
  const stayId = String(req.params.id);
  const checkIn = new Date(String(req.query.checkIn));
  const checkOut = new Date(String(req.query.checkOut));

  const data = await availabilityService.getAvailableRooms(stayId, checkIn, checkOut);

  sendSuccess(res, "Available rooms fetched", data);
});

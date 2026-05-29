import { Request, Response } from "express";

import {
  CreateVehicleInput,
  searchVehiclesSchema,
  UpdateVehicleInput,
  vehicleAvailabilitySchema,
  vehicleIdParamSchema,
  featuredVehiclesQuerySchema,
  vehicleReviewsQuerySchema,
  updateVehicleLocationSchema,
} from "../schemas/vehicles.schema";
import * as vehiclesService from "../services/vehicles.service";
import * as reviewsService from "../services/reviews.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { paginationFromQuery } from "../utils/pagination.util";

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

export const searchVehicles = asyncHandler(async (req: Request, res: Response) => {
  const query = searchVehiclesSchema.shape.query.parse(req.query);
  const data = await vehiclesService.searchVehicles(query);

  sendSuccess(res, "Vehicles fetched successfully", data);
});

export const getVehicleDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vehicleIdParamSchema.shape.params.parse(req.params);
  const data = await vehiclesService.getVehicleById(id, req.user?.id);

  sendSuccess(res, "Vehicle details fetched successfully", data);
});

export const getDriverVehicles = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const data = await vehiclesService.getDriverVehicles(
    driverId,
    paginationFromQuery(req.query as Record<string, unknown>),
  );

  sendSuccess(res, "Driver vehicles fetched successfully", data);
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const data = await vehiclesService.createVehicle(driverId, req.body as CreateVehicleInput);

  sendSuccess(res, "Vehicle created successfully", data, 201);
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const { id } = vehicleIdParamSchema.shape.params.parse(req.params);
  const data = await vehiclesService.updateVehicle(driverId, id, req.body as UpdateVehicleInput);

  sendSuccess(res, "Vehicle updated successfully", data);
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const driverId = getUserIdOrThrow(req);
  const { id } = vehicleIdParamSchema.shape.params.parse(req.params);
  const data = await vehiclesService.deleteVehicle(driverId, id);

  sendSuccess(res, "Vehicle deleted successfully", data);
});

export const getVehicleAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vehicleAvailabilitySchema.shape.params.parse(req.params);
  const query = vehicleAvailabilitySchema.shape.query.parse(req.query);
  const data = await vehiclesService.getVehicleAvailability(id, query);

  sendSuccess(res, "Vehicle availability fetched successfully", data);
});

export const getFeaturedVehicles = asyncHandler(async (req: Request, res: Response) => {
  const query = featuredVehiclesQuerySchema.shape.query.parse(req.query);
  const data = await vehiclesService.getFeaturedVehicles(query.limit);

  sendSuccess(res, "Featured vehicles fetched successfully", data);
});

export const getVehicleReviews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = vehicleReviewsQuerySchema.shape.params.parse(req.params);
  const query = vehicleReviewsQuerySchema.shape.query.parse(req.query);
  
  const data = await reviewsService.getReviewsByItem({
    itemId: id,
    itemType: "vehicle",
    page: query.page,
    limit: query.limit,
  });

  sendSuccess(res, "Vehicle reviews fetched successfully", data);
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id } = updateVehicleLocationSchema.shape.params.parse(req.params);
  const data = await vehiclesService.updateLocation(ownerId, id, req.body as import("../schemas/vehicles.schema").UpdateVehicleLocationInput);

  sendSuccess(res, "Vehicle location updated successfully", data);
});

export const getAvailableCities = asyncHandler(async (_req: Request, res: Response) => {
  const data = await vehiclesService.getAvailableCities();
  sendSuccess(res, "Cities fetched successfully", data);
});

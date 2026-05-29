import { Router } from "express";
import { UserRole } from "@prisma/client";

import { searchRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { requireVerifiedUser } from "../middlewares/verification.middleware";
import * as vehiclesController from "../controllers/vehicles.controller";
import {
  searchVehiclesSchema,
  vehicleAvailabilitySchema,
  vehicleIdParamSchema,
  featuredVehiclesQuerySchema,
  vehicleReviewsQuerySchema,
  updateVehicleLocationSchema,
  createVehicleSchema,
  updateVehicleSchema,
} from "../schemas/vehicles.schema";

const router = Router();

router.get(
  "/search",
  searchRateLimiter,
  validateRequest(searchVehiclesSchema),
  vehiclesController.searchVehicles,
);
router.get("/featured", searchRateLimiter, validateRequest(featuredVehiclesQuerySchema), vehiclesController.getFeaturedVehicles);
router.get("/owner", authenticate, requireRole(UserRole.OWNER), vehiclesController.getDriverVehicles);
router.post(
  "/",
  authenticate,
  requireRole(UserRole.OWNER),
  requireVerifiedUser,
  validateRequest(createVehicleSchema),
  vehiclesController.createVehicle,
);
router.put("/:id", authenticate, requireRole(UserRole.OWNER), validateRequest(updateVehicleSchema), vehiclesController.updateVehicle);
router.patch("/:id/location", authenticate, requireRole(UserRole.OWNER), validateRequest(updateVehicleLocationSchema), vehiclesController.updateLocation);
router.delete("/:id", authenticate, requireRole(UserRole.OWNER), validateRequest(vehicleIdParamSchema), vehiclesController.deleteVehicle);
router.get("/:id/availability",
  validateRequest(vehicleAvailabilitySchema),
  vehiclesController.getVehicleAvailability,
);
router.get("/available-cities", vehiclesController.getAvailableCities);
router.get("/:id", optionalAuthenticate, validateRequest(vehicleIdParamSchema), vehiclesController.getVehicleDetails);
router.get("/:id/reviews", validateRequest(vehicleReviewsQuerySchema), vehiclesController.getVehicleReviews);

export default router;

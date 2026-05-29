import { Router } from "express";

import * as driverController from "../controllers/driver.controller";
import * as vehiclesController from "../controllers/vehicles.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { requireVerifiedUser } from "../middlewares/verification.middleware";
import { updateDriverStatusSchema } from "../schemas/driver.schema";
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleIdParamSchema,
} from "../schemas/vehicles.schema";

const router = Router();

// Auth + verification apply to every driver endpoint.
router.use(authenticate);
router.use(requireVerifiedUser);

// ── Driver vehicles ─────────────────────────────────────────────────────────
router.get("/vehicles", vehiclesController.getDriverVehicles);
router.post(
  "/vehicles",
  validateRequest(createVehicleSchema),
  vehiclesController.createVehicle,
);
router.patch(
  "/vehicles/:id",
  validateRequest(updateVehicleSchema),
  vehiclesController.updateVehicle,
);
router.delete(
  "/vehicles/:id",
  validateRequest(vehicleIdParamSchema),
  vehiclesController.deleteVehicle,
);

// ── Driver online/offline status ────────────────────────────────────────────
router.get("/status", driverController.getDriverStatus);
router.patch(
  "/status",
  validateRequest(updateDriverStatusSchema),
  driverController.updateDriverStatus,
);

export default router;

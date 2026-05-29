import { Router } from "express";

import * as ridesController from "../controllers/rides.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  listDriverRidesSchema,
  rideIdParamsSchema,
  rideStatusStreamSchema,
  updateRideStatusSchema,
} from "../schemas/rides.schema";

const router = Router();

// All ride endpoints require authentication — driver identity comes from the JWT.
router.use(authenticate);

// Every endpoint runs through `validateRequest` so the controller can trust
// `req.params`, `req.query`, and `req.body` to match the typed schema.

router.get(
  "/",
  validateRequest(listDriverRidesSchema),
  ridesController.getDriverRides,
);

router.get(
  "/:rideId",
  validateRequest(rideIdParamsSchema),
  ridesController.getRideById,
);

router.put(
  "/:rideId/status",
  validateRequest(updateRideStatusSchema),
  ridesController.updateRideStatus,
);

router.get(
  "/:rideId/status-stream",
  validateRequest(rideStatusStreamSchema),
  ridesController.streamRideStatus,
);

export default router;

import { Router } from "express";
import { UserRole } from "@prisma/client";

import { searchRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { requireVerifiedUser } from "../middlewares/verification.middleware";
import * as attractionsController from "../controllers/attractions.controller";
import {
  attractionIdParamSchema,
  getAttractionSlotsSchema,
  searchAttractionsSchema,
  updateAttractionSlotSchema,
  updateAttractionSchema,
  featuredAttractionsQuerySchema,
  attractionReviewsQuerySchema,
  toggleSlotStatusSchema,
  createAttractionSchema,
  createAttractionSlotSchema,
  deleteAttractionSlotSchema,
  attractionAvailabilitySchema,
} from "../schemas/attractions.schema";

const router = Router();

/**
 * @section Public Endpoints
 */

router.get("/", attractionsController.searchAttractions);

router.get(
  "/search",
  searchRateLimiter,
  validateRequest(searchAttractionsSchema),
  attractionsController.searchAttractions,
);
router.get("/featured", searchRateLimiter, validateRequest(featuredAttractionsQuerySchema), attractionsController.getFeaturedAttractions);
// Owner-specific attractions endpoint removed: attractions have no owner association in the schema
// All creation/mutation of attractions must happen via admin.routes.ts
router.get(
  "/:id/availability",
  validateRequest(attractionAvailabilitySchema),
  attractionsController.getAttractionAvailability,
);
router.get("/:id/slots", validateRequest(getAttractionSlotsSchema), attractionsController.getAttractionSlots);
// Owner-specific attraction slot endpoints removed.
// Slots are managed via admin.routes.ts
router.get("/:id", validateRequest(attractionIdParamSchema), attractionsController.getAttractionDetails);
router.get("/:id/reviews", validateRequest(attractionReviewsQuerySchema), attractionsController.getAttractionReviews);

export default router;

import { Router } from "express";
import { UserRole } from "@prisma/client";

import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { searchRateLimiter } from "../middlewares/rate-limit.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import * as staysController from "../controllers/stays.controller";
import {
  searchStaysSchema,
  createOwnerStaySchema,
  stayIdParamSchema,
  updateStaySchema,
  featuredStaysQuerySchema,
  stayReviewsQuerySchema,
} from "../schemas/stays.schema";

const router = Router();

router.get("/featured", searchRateLimiter, validateRequest(featuredStaysQuerySchema), staysController.getFeaturedStays);
router.get("/search", searchRateLimiter, validateRequest(searchStaysSchema), staysController.searchStays);
router.get("/owner/properties", authenticate, requireRole(UserRole.OWNER), staysController.getOwnerProperties);
router.post(
  "/owner/properties",
  authenticate,
  requireRole(UserRole.OWNER),
  validateRequest(createOwnerStaySchema),
  staysController.createOwnerProperty,
);
router.get("/:id", optionalAuthenticate, validateRequest(stayIdParamSchema), staysController.getStayDetails);
router.get("/:id/reviews", validateRequest(stayReviewsQuerySchema), staysController.getStayReviews);
router.put("/:id", authenticate, requireRole(UserRole.OWNER), validateRequest(updateStaySchema), staysController.updateStay);
router.delete("/:id", authenticate, requireRole(UserRole.OWNER), validateRequest(stayIdParamSchema), staysController.deleteStay);

export default router;

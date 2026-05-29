import { Router } from "express";
import { UserRole } from "@prisma/client";

import * as ownerController from "../controllers/owner.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { submitOwnerVerificationSchema } from "../schemas/owner.schema";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.OWNER));

router.get("/dashboard", ownerController.getOwnerDashboard);
router.get("/analytics", ownerController.getOwnerAnalytics);
router.get("/reviews", ownerController.getOwnerReviews);
router.post("/reviews/:id/reply", ownerController.replyToReview);
router.post(
  "/verification/submit",
  validateRequest(submitOwnerVerificationSchema),
  ownerController.submitOwnerVerification,
);
router.get("/verification/status", ownerController.getOwnerStatus);

if (process.env.NODE_ENV !== "production") {
  // DEV-ONLY: Instantly approve owner for testing
  router.post("/verification/dev-approve", ownerController.devApproveOwner);

  // DEV-ONLY: Instantly approve a stay listing for testing
  router.post("/stays/:stayId/dev-approve", ownerController.devApproveStay);
}

export default router;



import { Router } from "express";

import * as reviewsController from "../controllers/reviews.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  createReviewSchema,
  getReviewsSchema,
  markHelpfulSchema,
  reviewIdParamSchema,
  updateReviewSchema,
  reportReviewSchema,
} from "../schemas/reviews.schema";

const router = Router();

router.get("/", validateRequest(getReviewsSchema), reviewsController.getReviews);
router.post("/", authenticate, validateRequest(createReviewSchema), reviewsController.createReview);
router.put("/:id", authenticate, validateRequest(updateReviewSchema), reviewsController.updateReview);
router.delete("/:id", authenticate, validateRequest(reviewIdParamSchema), reviewsController.deleteReview);
router.post("/:id/helpful", authenticate, validateRequest(markHelpfulSchema), reviewsController.markHelpful);
router.get("/me", authenticate, reviewsController.getMyReviews);
router.get("/:id", validateRequest(reviewIdParamSchema), reviewsController.getReview);
router.post("/:id/report", authenticate, validateRequest(reportReviewSchema), reviewsController.reportReview);

export default router;

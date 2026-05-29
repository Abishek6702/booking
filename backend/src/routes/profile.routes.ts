import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import * as profileController from "../controllers/profile.controller";
import {
  applyDriverSchema,
  profileBookingsQuerySchema,
  toggleFavoriteSchema,
  updateProfileSchema,
  updateAvatarSchema,
} from "../schemas/profile.schema";

const router = Router();

router.use(authenticate);

router.get("/", profileController.getProfile);
router.put("/", validateRequest(updateProfileSchema), profileController.updateProfile);
router.patch("/avatar", validateRequest(updateAvatarSchema), profileController.updateAvatar);
router.delete("/", profileController.deleteAccount);
router.get("/bookings", validateRequest(profileBookingsQuerySchema), profileController.getMyBookings);
router.post("/favorites", validateRequest(toggleFavoriteSchema), profileController.toggleFavorite);
router.get("/favorites", profileController.getMyFavorites);
router.get("/reviews", profileController.getMyReviews);
router.post("/driver/apply", validateRequest(applyDriverSchema), profileController.applyAsDriver);

export default router;

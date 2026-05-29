import { Router } from "express";

import * as notificationsController from "../controllers/notifications.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", notificationsController.getNotifications);
router.put("/:id/read", notificationsController.markAsRead);
router.put("/read-all", notificationsController.markAllAsRead);

export default router;

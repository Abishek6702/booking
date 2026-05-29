import { Router } from "express";
import { UserRole } from "@prisma/client";

import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import * as roomsController from "../controllers/rooms.controller";
import { createRoomSchema, stayParamSchema, stayRoomParamSchema, updateRoomSchema, roomAvailabilitySchema } from "../schemas/rooms.schema";

const router = Router();

router.get("/:id/rooms", optionalAuthenticate, validateRequest(stayParamSchema), roomsController.getStayRooms);
router.get("/:id/rooms/:roomId", validateRequest(stayRoomParamSchema), roomsController.getRoom);
router.get("/:id/rooms/:roomId/availability", validateRequest(roomAvailabilitySchema), roomsController.getRoomAvailability);

router.post("/:id/rooms", authenticate, requireRole(UserRole.OWNER), validateRequest(createRoomSchema), roomsController.createRoom);
router.put("/:id/rooms/:roomId", authenticate, requireRole(UserRole.OWNER), validateRequest(updateRoomSchema), roomsController.updateRoom);
router.delete(
  "/:id/rooms/:roomId",
  authenticate,
  requireRole(UserRole.OWNER),
  validateRequest(stayRoomParamSchema),
  roomsController.deleteRoom,
);

export default router;

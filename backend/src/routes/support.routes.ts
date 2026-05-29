import { Router } from "express";
import { UserRole } from "@prisma/client";

import * as supportController from "../controllers/support.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  closeTicketSchema,
  createTicketSchema,
  getTicketByIdSchema,
  listTicketsSchema,
  replyTicketSchema,
} from "../schemas/support.schema";

const router = Router();

router.use(authenticate);

router.post("/tickets", validateRequest(createTicketSchema), supportController.createTicket);
router.get("/tickets", validateRequest(listTicketsSchema), supportController.listTickets);
router.get("/tickets/:id", validateRequest(getTicketByIdSchema), supportController.getTicketById);
router.get("/tickets/:id/stream", validateRequest(getTicketByIdSchema), supportController.streamTicket);
router.post("/tickets/:id/reply", validateRequest(replyTicketSchema), supportController.replyToTicket);
router.put(
  "/tickets/:id/close",
  requireRole(UserRole.ADMIN),
  validateRequest(closeTicketSchema),
  supportController.closeTicket,
);

export default router;

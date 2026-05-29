import { Router } from "express";
import { UserRole } from "@prisma/client";

import * as adminController from "../controllers/admin.controller";
import * as attractionsController from "../controllers/attractions.controller";
import * as supportController from "../controllers/support.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { uploadExcelMiddleware } from "../middlewares/upload.middleware";
import {
  closeTicketSchema,
  getTicketByIdSchema,
  replyTicketSchema,
} from "../schemas/support.schema";
import {
  createAttractionSchema,
  updateAttractionSchema,
  createAttractionSlotSchema,
  updateAttractionSlotSchema,
} from "../schemas/attractions.schema";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

/**
 * @section User & Verification Management
 */
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetails);
router.put("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);
router.patch("/users/:id/approve-owner", adminController.approveOwner);
router.patch("/users/:id/reject-owner", adminController.rejectOwner);
router.patch("/users/:id/approve-driver", adminController.approveDriver);
router.patch("/users/:id/reject-driver", adminController.rejectDriver);

/**
 * @section Property (Stay) Moderation
 */
router.get("/stays", adminController.listStays);
router.patch("/stays/:id/approve", adminController.approveStay);
router.patch("/stays/:id/reject", adminController.rejectStay);

/**
 * @section Vehicle Moderation
 */
router.get("/vehicles", adminController.listVehicles);
router.patch("/vehicles/:id/approve", adminController.approveVehicle);
router.patch("/vehicles/:id/reject", adminController.rejectVehicle);

/**
 * @section Attraction Management (Admin Controlled)
 */
router.post("/attractions", validateRequest(createAttractionSchema), attractionsController.createAttraction);
router.post("/attractions/bulk", uploadExcelMiddleware, attractionsController.bulkUploadAttractions);
router.patch("/attractions/:id", validateRequest(updateAttractionSchema), attractionsController.updateAttraction);
router.delete("/attractions/:id", attractionsController.deleteAttraction);
router.post("/attractions/:id/slots", validateRequest(createAttractionSlotSchema), attractionsController.createAttractionSlot);
router.patch("/attractions/:id/slots/:slotId", validateRequest(updateAttractionSlotSchema), attractionsController.updateAttractionSlot);
router.delete("/attractions/:id/slots/:slotId", attractionsController.deleteAttractionSlot);

/**
 * @section Business Verification (Legacy Flow)
 */
router.get("/owners/pending", adminController.listPendingOwners);
router.get("/drivers/pending", adminController.listPendingDrivers);
router.patch("/owners/:id/approve", adminController.approveOwnerVerification);
router.patch("/owners/:id/reject", adminController.rejectOwnerVerification);

/**
 * @section Platform Insights
 */
router.get("/bookings", adminController.listBookings);
router.get("/reviews", adminController.listReviews);
router.delete("/reviews/:id", adminController.deleteReview);

router.get("/support/tickets", adminController.listSupportTickets);
router.get("/support/tickets/:id", validateRequest(getTicketByIdSchema), supportController.getTicketById);
router.post("/support/tickets/:id/reply", validateRequest(replyTicketSchema), supportController.replyToTicket);
router.put("/support/tickets/:id/close", validateRequest(closeTicketSchema), supportController.closeTicket);
router.get("/payments", adminController.listPayments);
router.get("/stats", adminController.getStats);

export default router;

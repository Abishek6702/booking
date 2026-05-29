import { Router } from "express";

import * as paymentsController from "../controllers/payments.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import { paymentIdParamSchema, processPaymentSchema, refundPaymentSchema } from "../schemas/payments.schema";

const router = Router();

router.use(authenticate);

router.post("/process", validateRequest(processPaymentSchema), paymentsController.processPayment);
router.get("/", paymentsController.getUserPayments);
router.get("/:id", validateRequest(paymentIdParamSchema), paymentsController.getPaymentById);
router.post("/:id/refund", validateRequest(refundPaymentSchema), paymentsController.requestRefund);

export default router;

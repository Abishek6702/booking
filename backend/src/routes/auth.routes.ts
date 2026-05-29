import { Router } from "express";
import { UserRole } from "@prisma/client";

import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { authRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import * as authController from "../controllers/auth.controller";
import { uploadExcelMiddleware, uploadOwnerDocsMiddleware } from "../middlewares/upload.middleware";
import {
  adminRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
  verifyEmailSchema,
  changePasswordSchema,
} from "../schemas/auth.schema";

const router = Router();

router.post("/register", authRateLimiter, uploadOwnerDocsMiddleware, validateRequest(registerSchema), authController.register);
router.post("/admin/register", authRateLimiter, validateRequest(adminRegisterSchema), authController.registerAdmin);
router.post("/login", authRateLimiter, validateRequest(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);
router.post("/refresh", authRateLimiter, validateRequest(refreshSchema), authController.refresh);
router.post("/logout", authRateLimiter, validateRequest(logoutSchema), authController.logout);
router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/verify-reset-code",
  authRateLimiter,
  validateRequest(verifyResetCodeSchema),
  authController.verifyResetCode,
);
router.post("/reset-password", authRateLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.post("/verify-email", authRateLimiter, validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post(
  "/resend-verification",
  authenticate,
  authRateLimiter,
  authController.resendVerificationEmail,
);
router.post(
  "/change-password",
  authenticate,
  authRateLimiter,
  validateRequest(changePasswordSchema),
  authController.changePassword,
);
router.post(
  "/revoke-sessions",
  authenticate,
  authRateLimiter,
  authController.revokeSessions,
);

// DEV-ONLY: Instantly verify a user. Blocked in production at both route and controller level.
// Protected by authenticate + requireAdmin so only an existing admin can call it.
if (process.env.NODE_ENV !== "production") {
  router.post("/dev-approve", authenticate, requireRole(UserRole.ADMIN), authController.devApproveUser);
}

export default router;

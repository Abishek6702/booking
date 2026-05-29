import { Request, Response } from "express";

import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import {
  AdminRegisterInput,
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyResetCodeInput,
  VerifyEmailInput,
  ChangePasswordInput,
} from "../schemas/auth.schema";
import * as authService from "../services/auth.service";
import { toUploadedFilePayload } from "../services/upload.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const documents: string[] = [];

  // If files were uploaded (owner registration)
  if (req.files && typeof req.files === "object") {
    const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
    Object.values(filesMap).forEach((fileArray) => {
      fileArray.forEach((file) => {
        const payload = toUploadedFilePayload(req, file);
        documents.push(payload.fileUrl);
      });
    });
  }

  const result = await authService.register({
    ...(req.body as RegisterInput),
    documents,
  });
  sendSuccess(res, "User registered successfully", result, 201);
});

export const registerAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerAdmin(req.body as AdminRegisterInput);
  sendSuccess(res, "Admin registered successfully", result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess(res, "User logged in successfully", result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = await authService.getMe(req.user.id);
  sendSuccess(res, "Current user fetched successfully", result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body as RefreshInput);
  sendSuccess(res, "Token refreshed successfully", result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.logout(req.body as LogoutInput);
  sendSuccess(res, "Logged out successfully", result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
  sendSuccess(res, "Reset code sent successfully", result);
});

export const verifyResetCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyResetCode(req.body as VerifyResetCodeInput);
  sendSuccess(res, "Reset code verified successfully", result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body as ResetPasswordInput);
  sendSuccess(res, "Password reset successfully", result);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyEmail(req.body as VerifyEmailInput);
  sendSuccess(res, "Email verified successfully", result);
});

export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = await authService.resendVerificationEmail(req.user.id);
  sendSuccess(res, "Verification email dispatched", result);
});

export const devApproveUser = asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "This endpoint is not available in production");
  }

  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const { prisma } = await import("../config/prisma");
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { isVerified: true },
    select: { id: true, email: true, isVerified: true },
  });

  sendSuccess(res, "User approved successfully (dev mode)", updated);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = await authService.changePassword(req.user.id, req.body as ChangePasswordInput);
  sendSuccess(res, "Password changed successfully", result);
});

export const revokeSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = await authService.revokeSessions(req.user.id);
  sendSuccess(res, "All sessions revoked successfully", result);
});

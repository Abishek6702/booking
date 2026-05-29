import { z } from "zod";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    name: z.string().trim().min(2).max(100),
    phone: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().trim().min(7).max(20).optional()
    ),
    password: passwordSchema,
    role: z.enum(["customer", "owner"]).optional().default("customer"),
    documents: z.array(z.string().url()).optional(),
  }),
});

export const adminRegisterSchema = z.object({
  body: z.object({
    email: emailSchema,
    name: z.string().trim().min(2).max(100),
    password: passwordSchema,
    setupCode: z.string().trim().min(1).max(200).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const verifyResetCodeSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: z.string().trim().min(6, "Reset code is required").max(128, "Reset code is too long"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: z.string().trim().min(6, "Reset code is required").max(128, "Reset code is too long"),
    password: passwordSchema,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().trim().min(6, "Verification token is required").max(128, "Verification token is too long"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type RefreshInput = z.infer<typeof refreshSchema>["body"];
export type LogoutInput = z.infer<typeof logoutSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];

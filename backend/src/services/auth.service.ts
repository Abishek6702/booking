import { Prisma, UserRole } from "@prisma/client";
import { createHash, randomInt } from "node:crypto";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "../utils/email.util";
import { getLogger, serializeError } from "../utils/logger.util";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.util";
import { comparePassword, hashPassword } from "../utils/password.util";
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
} from "../schemas/auth.schema";

const authLogger = getLogger("services.auth");

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  driverStatus: true,
  membershipTier: true,
  lifetimeSpend: true,
  isVerified: true,
  ownerStatus: true,
  documents: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const authUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

const toPublicUser = (user: AuthUser): PublicUser => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

const mapRequestedRole = (role: RegisterInput["role"]): UserRole => {
  if (role === "owner") {
    return UserRole.OWNER;
  }
  return UserRole.CUSTOMER;
};

const tokenExpiryDate = (): Date => {
  return new Date(Date.now() + 15 * 60 * 1000);
};

const emailVerificationExpiryDate = (): Date => {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};

const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const generateOneTimeCode = (): string => {
  return randomInt(100_000, 1_000_000).toString();
};

const issueEmailVerificationToken = async (userId: string) => {
  const emailVerificationToken = generateOneTimeCode();

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: hashToken(emailVerificationToken),
      emailVerificationExpires: emailVerificationExpiryDate(),
    },
  });

  return emailVerificationToken;
};

const sendVerificationEmailBestEffort = async (
  user: { id: string; email: string; name: string },
): Promise<string | null> => {
  const emailVerificationToken = await issueEmailVerificationToken(user.id);

  try {
    await sendEmailVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      verificationToken: emailVerificationToken,
    });
  } catch (error) {
    authLogger.warn(
      {
        event: "email_verification_send_failed",
        userId: user.id,
        error: serializeError(error),
      },
      "Email verification send failed",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return emailVerificationToken;
  }

  return null;
};

// Refresh token max lifetime — used to set expiry on revocation records.
// Must match JWT_REFRESH_EXPIRES env or the 7d default in jwt.util.ts.
const refreshTokenMaxLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const isRefreshTokenRevoked = async (token: string): Promise<boolean> => {
  const tokenHash = hashToken(token);

  const revoked = await prisma.revokedToken.findUnique({
    where: { tokenHash },
    select: { id: true },
  });

  return !!revoked;
};

const revokeRefreshToken = async (token: string, userId: string): Promise<void> => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + refreshTokenMaxLifetimeMs);

  try {
    await prisma.revokedToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  } catch (error) {
    // If duplicate (already revoked), ignore
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }

    throw error;
  }
};

/** Removes expired revocation records. Call periodically (e.g., daily cron). */
export const cleanupExpiredRevokedTokens = async (): Promise<number> => {
  const result = await prisma.revokedToken.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  return result.count;
};

export const register = async (payload: RegisterInput) => {
  const email = payload.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(payload.password);

  const createData: Prisma.UserCreateInput = {
    email,
    name: payload.name,
    passwordHash,
    role: mapRequestedRole(payload.role),
    phone: payload.phone ?? null,
    documents: payload.documents ?? [],
  };

  const createdUser = await prisma.user.create({
    data: createData,
    select: publicUserSelect,
  });

  const verificationToken = await sendVerificationEmailBestEffort({
    id: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
  });

  const tokens = generateTokenPair({
    id: createdUser.id,
    email: createdUser.email,
    role: createdUser.role,
  });

  return {
    user: createdUser,
    tokens,
    verificationRequired: !createdUser.isVerified,
    ...(verificationToken
      ? {
          verificationToken,
        }
      : {}),
  };
};

export const registerAdmin = async (payload: AdminRegisterInput) => {
  const email = payload.email.toLowerCase();

  // Count existing admins — if the DB is unavailable, fail closed (deny registration)
  // rather than fail open (allow registration). This prevents a flaky DB from
  // being exploited to bypass the setup code requirement.
  let adminCount: number;
  try {
    adminCount = await Promise.race([
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ]);
  } catch (error) {
    authLogger.error(
      { event: "admin_count_check_failed", error: serializeError(error) },
      "Database error during admin count check — registration denied for safety"
    );
    throw new ApiError(503, "Service temporarily unavailable. Please try again.");
  }

  const setupCode = process.env.ADMIN_REGISTRATION_CODE?.trim();

  if (adminCount > 0) {
    if (!setupCode) {
      throw new ApiError(403, "Admin registration is disabled");
    }

    if (payload.setupCode !== setupCode) {
      throw new ApiError(403, "Invalid admin setup code");
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(payload.password);

  const createdUser = await prisma.user.create({
    data: {
      email,
      name: payload.name,
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    select: publicUserSelect,
  });

  const tokens = generateTokenPair({
    id: createdUser.id,
    email: createdUser.email,
    role: createdUser.role,
  });

  return {
    user: createdUser,
    tokens,
  };
};

export const login = async (payload: LoginInput) => {
  const email = payload.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: authUserSelect,
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatched = await comparePassword(payload.password, user.passwordHash);
  if (!passwordMatched) {
    throw new ApiError(401, "Invalid email or password");
  }

  const safeUser = toPublicUser(user);
  const tokens = generateTokenPair({
    id: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return {
    user: safeUser,
    tokens,
  };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    user,
  };
};

export const refresh = async (payload: RefreshInput) => {
  if (await isRefreshTokenRevoked(payload.refreshToken)) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  let tokenPayload;
  try {
    tokenPayload = verifyRefreshToken(payload.refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.sub },
    select: { ...publicUserSelect, passwordChangedAt: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid refresh token user");
  }

  // Reject refresh tokens issued before the last password change.
  // This ensures that stolen refresh tokens are invalidated after a password reset.
  if (user.passwordChangedAt) {
    const passwordChangedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (tokenPayload.iat < passwordChangedAtSeconds) {
      throw new ApiError(401, "Session expired: password was changed, please log in again");
    }
  }

  // Rotate: revoke the old token, issue new pair
  await revokeRefreshToken(payload.refreshToken, user.id);

  const { passwordChangedAt: _pca, ...safeUser } = user;

  const tokens = generateTokenPair({
    id: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return {
    tokens,
  };
};

export const logout = async (payload: LogoutInput) => {
  const refreshToken = payload.refreshToken?.trim();

  if (!refreshToken) {
    return {
      revoked: false,
    };
  }

  let tokenPayload;
  try {
    tokenPayload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  await revokeRefreshToken(refreshToken, tokenPayload.sub);

  return {
    revoked: true,
  };
};

export const forgotPassword = async (payload: ForgotPasswordInput) => {
  const email = payload.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  // Always return the same response regardless of whether the email exists.
  // This prevents user enumeration — an attacker cannot tell if an account exists.
  if (!user) {
    return {};
  }

  const resetCode = generateOneTimeCode();
  const hashedResetCode = hashToken(resetCode);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedResetCode,
      passwordResetExpires: tokenExpiryDate(),
    },
  });

  try {
    await sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      resetToken: resetCode,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(502, "Unable to send password reset email");
    }

    authLogger.warn(
      {
        event: "password_reset_email_failed",
        userId: user.id,
        error: serializeError(error),
      },
      "Password reset email send failed",
    );
  }

  return {
    ...(process.env.NODE_ENV !== "production"
      ? {
          resetCode,
        }
      : {}),
  };
};

export const verifyResetCode = async (payload: VerifyResetCodeInput) => {
  const email = payload.email.toLowerCase();
  const hashedResetCode = hashToken(payload.code);

  const user = await prisma.user.findFirst({
    where: {
      email,
      passwordResetToken: hashedResetCode,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new ApiError(400, "Reset code is invalid or has expired");
  }

  return {};
};

export const resetPassword = async (payload: ResetPasswordInput) => {
  const email = payload.email.toLowerCase();
  const hashedResetCode = hashToken(payload.code);

  const user = await prisma.user.findFirst({
    where: {
      email,
      passwordResetToken: hashedResetCode,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new ApiError(400, "Reset code is invalid or has expired");
  }

  const passwordHash = await hashPassword(payload.password);
  const passwordChangedAt = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Update password and clear the reset token
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt,
      },
    });

    // 2. Delete all existing revoked-token records for this user so the table
    //    stays clean, then insert a sentinel record that marks all tokens issued
    //    before now as invalid. The auth middleware already rejects access tokens
    //    via the passwordChangedAt check. For refresh tokens we use a bulk
    //    "revoke all by userId" approach: any refresh token whose iat is before
    //    passwordChangedAt is rejected by the middleware; we also purge the
    //    RevokedToken table of stale entries for this user.
    await tx.revokedToken.deleteMany({
      where: { userId: user.id },
    });
  });

  return {};
};

export const changePassword = async (userId: string, payload: import("../schemas/auth.schema").ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const passwordMatched = await comparePassword(payload.currentPassword, user.passwordHash);
  if (!passwordMatched) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const passwordHash = await hashPassword(payload.newPassword);
  const passwordChangedAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt,
    },
  });

  return {};
};

export const revokeSessions = async (userId: string) => {
  const passwordChangedAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordChangedAt,
    },
  });

  return {};
};

export const verifyEmail = async (payload: VerifyEmailInput) => {
  const hashedVerificationToken = hashToken(payload.token);

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedVerificationToken,
    },
    select: {
      id: true,
      isVerified: true,
      emailVerificationExpires: true,
    },
  });

  if (!user) {
    throw new ApiError(400, "Verification token is invalid or has expired");
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() <= Date.now()) {
    throw new ApiError(400, "Verification token is invalid or has expired");
  }

  if (user.isVerified) {
    // Already verified — just clean up the token, don't issue new credentials
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return {
      verified: true,
      alreadyVerified: true,
    };
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
    select: publicUserSelect,
  });

  const tokens = generateTokenPair({
    id: verifiedUser.id,
    email: verifiedUser.email,
    role: verifiedUser.role,
  });

  return {
    verified: true,
    alreadyVerified: false,
    user: verifiedUser,
    tokens,
  };
};

export const resendVerificationEmail = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    return {
      resent: false,
      alreadyVerified: true,
    };
  }

  const emailVerificationToken = await issueEmailVerificationToken(user.id);

  try {
    await sendEmailVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      verificationToken: emailVerificationToken,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(502, "Unable to send verification email");
    }

    authLogger.warn(
      {
        event: "email_verification_resend_failed",
        userId: user.id,
        error: serializeError(error),
      },
      "Email verification resend failed",
    );
  }

  return {
    resent: true,
    alreadyVerified: false,
    ...(process.env.NODE_ENV !== "production"
      ? {
          verificationToken: emailVerificationToken,
        }
      : {}),
  };
};

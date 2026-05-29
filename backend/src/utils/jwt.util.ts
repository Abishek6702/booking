import { UserRole } from "@prisma/client";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export type JwtTokenType = "access" | "refresh";

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: JwtTokenType;
  /** Set by jwt.sign() automatically. Present after verification, not during generation. */
  iat: number;
}

/** Payload shape used when generating tokens — iat is set internally by jwt.sign(). */
type TokenGeneratePayload = Omit<TokenPayload, "type" | "iat">;

interface TokenPairInput {
  id: string;
  email: string;
  role: UserRole;
}

const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getTokenExpiry = (
  key: string,
  fallbackValue: NonNullable<SignOptions["expiresIn"]>,
): NonNullable<SignOptions["expiresIn"]> => {
  const value = process.env[key];
  return value && value.trim().length > 0
    ? (value as NonNullable<SignOptions["expiresIn"]>)
    : fallbackValue;
};

const parseVerifiedPayload = (decoded: string | JwtPayload): TokenPayload => {
  if (typeof decoded !== "object" || !decoded.sub || !decoded.email || !decoded.role || !decoded.type) {
    throw new Error("Invalid token payload");
  }

  if (decoded.type !== "access" && decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  const role = String(decoded.role);
  if (role !== UserRole.ADMIN && role !== UserRole.OWNER && role !== UserRole.CUSTOMER) {
    throw new Error("Invalid user role in token");
  }

  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
    role: role as UserRole,
    type: decoded.type,
    iat: typeof decoded.iat === "number" ? decoded.iat : Math.floor(Date.now() / 1000),
  };
};

export const generateAccessToken = (payload: TokenGeneratePayload): string => {
  const secret = getEnvOrThrow("JWT_ACCESS_SECRET");
  const expiresIn = getTokenExpiry("JWT_ACCESS_EXPIRES", "15m");

  return jwt.sign({ ...payload, type: "access" }, secret, {
    expiresIn,
  });
};

export const generateRefreshToken = (payload: TokenGeneratePayload): string => {
  const secret = getEnvOrThrow("JWT_REFRESH_SECRET");
  const expiresIn = getTokenExpiry("JWT_REFRESH_EXPIRES", "7d");

  return jwt.sign({ ...payload, type: "refresh" }, secret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = getEnvOrThrow("JWT_ACCESS_SECRET");
  const decoded = jwt.verify(token, secret);
  const payload = parseVerifiedPayload(decoded);

  if (payload.type !== "access") {
    throw new Error("Invalid access token type");
  }

  return payload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = getEnvOrThrow("JWT_REFRESH_SECRET");
  const decoded = jwt.verify(token, secret);
  const payload = parseVerifiedPayload(decoded);

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  return payload;
};

export const generateTokenPair = ({ id, email, role }: TokenPairInput): {
  accessToken: string;
  refreshToken: string;
} => {
  const basePayload: TokenGeneratePayload = {
    sub: id,
    email,
    role,
  };

  return {
    accessToken: generateAccessToken(basePayload),
    refreshToken: generateRefreshToken(basePayload),
  };
};

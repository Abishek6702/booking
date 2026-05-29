import { NextFunction, Request, Response } from "express";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { verifyAccessToken } from "../utils/jwt.util";

const getStreamQueryToken = (req: Request): string | null => {
  const isStreamRequest = req.method === "GET" && req.path.endsWith("/stream");
  if (!isStreamRequest) {
    return null;
  }

  const rawToken = req.query.accessToken;
  if (typeof rawToken !== "string") {
    return null;
  }

  const token = rawToken.trim();
  return token.length > 0 ? token : null;
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const streamQueryToken = getStreamQueryToken(req);

  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  } else if (streamQueryToken) {
    token = streamQueryToken;
  }

  if (!token) {
    next(new ApiError(401, "Unauthorized: missing Bearer token"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    // Check if the user's password was changed after this token was issued.
    // If so, the token is stale and must be rejected to prevent
    // post-password-reset session hijacking.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { passwordChangedAt: true },
    });

    if (!user) {
      next(new ApiError(401, "Unauthorized: user no longer exists"));
      return;
    }

    if (user?.passwordChangedAt) {
      const passwordChangedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);

      if (payload.iat < passwordChangedAtSeconds) {
        next(new ApiError(401, "Unauthorized: password was changed, please log in again"));
        return;
      }
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, "Unauthorized: invalid or expired access token"));
  }
};

// Optional: sets req.user if a valid token is present, but doesn't block if missing
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { passwordChangedAt: true },
    });

    if (!user) {
      next();
      return;
    }

    if (user.passwordChangedAt) {
      const passwordChangedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);

      if (payload.iat < passwordChangedAtSeconds) {
        next();
        return;
      }
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
};


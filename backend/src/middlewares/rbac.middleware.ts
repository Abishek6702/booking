import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/error.util";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      next(new ApiError(401, "Unauthorized"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "Forbidden: insufficient role"));
      return;
    }

    next();
  };
};

export const requireOwnership = (resolveOwnerId: (req: Request) => string | undefined) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      next(new ApiError(401, "Unauthorized"));
      return;
    }

    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    const ownerId = resolveOwnerId(req);
    if (!ownerId || ownerId !== req.user.id) {
      next(new ApiError(403, "Forbidden: ownership required"));
      return;
    }

    next();
  };
};
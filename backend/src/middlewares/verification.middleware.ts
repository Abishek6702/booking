import { NextFunction, Request, Response } from "express";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";

export const requireVerifiedUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.user?.id) {
    next(new ApiError(401, "Unauthorized"));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        isVerified: true,
      },
    });

    if (!user) {
      next(new ApiError(401, "Unauthorized"));
      return;
    }

    if (!user.isVerified) {
      next(new ApiError(403, "Email verification is required to perform this action"));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

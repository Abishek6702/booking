import { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/error.util";

const idempotencyKeyHeaders = ["idempotency-key", "idempotencykey", "x-idempotency-key"];
const maxIdempotencyKeyLength = 128;
const idempotencyKeyPattern = /^[A-Za-z0-9:_\-.]{8,128}$/;

export const requireBookingIdempotencyKey = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const headerValue = idempotencyKeyHeaders
    .map((header) => req.headers[header])
    .flatMap((value) => (Array.isArray(value) ? [value[0]] : [value]))
    .find((value) => typeof value === "string" && value.trim().length > 0);

  const idempotencyKey = typeof headerValue === "string" ? headerValue.trim() : "";

  if (!idempotencyKey) {
    next(new ApiError(400, "idempotencyKey header is required for booking creation"));
    return;
  }

  if (idempotencyKey.length > maxIdempotencyKeyLength || !idempotencyKeyPattern.test(idempotencyKey)) {
    next(
      new ApiError(
        400,
        "idempotencyKey must be 8-128 chars and contain only letters, numbers, colon, underscore, dash, or dot",
      ),
    );
    return;
  }

  req.idempotencyKey = idempotencyKey;
  next();
};

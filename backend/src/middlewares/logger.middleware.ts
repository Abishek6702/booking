import { randomUUID } from "node:crypto";

import { NextFunction, Request, Response } from "express";

import { getLogger, sanitizeLogMetadata } from "../utils/logger.util";

const requestLogger = getLogger("http.request");

const resolveRequestId = (req: Request): string => {
  const headerValue = req.headers["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue) && typeof headerValue[0] === "string" && headerValue[0].trim().length > 0) {
    return headerValue[0].trim();
  }

  return randomUUID();
};

const shouldSkipLogging = (req: Request): boolean => {
  return req.path === "/api/v1/health";
};

export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (shouldSkipLogging(req)) {
    next();
    return;
  }

  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const metadata = sanitizeLogMetadata({
      event: "http_request_completed",
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });

    if (res.statusCode >= 500) {
      requestLogger.error(metadata, "HTTP request failed");
      return;
    }

    if (res.statusCode >= 400) {
      requestLogger.warn(metadata, "HTTP request completed with client error");
      return;
    }

    requestLogger.info(metadata, "HTTP request completed");
  });

  next();
};

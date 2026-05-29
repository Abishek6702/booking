import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { getLogger, sanitizeLogMetadata, serializeError } from "./logger.util";

const errorLogger = getLogger("http.error");

const prismaUnavailableErrorCodes = new Set(["ETIMEDOUT", "ECONNREFUSED", "P1001", "P1002", "P1008", "P1017", "P2024", "P2028"]);

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly data: Record<string, unknown>;

  constructor(statusCode: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data: T,
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Sugar for `sendSuccess(res, message, data, 201)`. Use for create endpoints
 * so call sites don't have to remember to pass `201` explicitly.
 */
export const sendCreated = <T>(res: Response, message: string, data: T): Response =>
  sendSuccess(res, message, data, 201);

/**
 * Sugar for endpoints that return no payload (e.g. plain DELETE acks).
 * Always returns `data: {}` so the response envelope is identical to every
 * other success response.
 */
export const sendOk = (res: Response, message: string): Response =>
  sendSuccess(res, message, {});

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (handler: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  const requestMetadata = {
    event: "http_error",
    requestId: req.requestId ?? null,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id ?? null,
  };

  if (error instanceof ApiError) {
    const logEntry = sanitizeLogMetadata({
      ...requestMetadata,
      statusCode: error.statusCode,
      data: error.data,
      error: serializeError(error),
    });

    if (error.statusCode >= 500) {
      errorLogger.error(logEntry, error.message);
    } else {
      errorLogger.warn(logEntry, error.message);
    }

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      data: error.data,
    });
  }

  if (error instanceof ZodError) {
    errorLogger.warn(
      sanitizeLogMetadata({
        ...requestMetadata,
        statusCode: 400,
        issueCount: error.issues.length,
      }),
      "Request validation failed",
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      data: {
        issues: error.flatten(),
      },
    });
  }

  if (error instanceof MulterError) {
    errorLogger.warn(
      sanitizeLogMetadata({
        ...requestMetadata,
        statusCode: error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
        multerCode: error.code,
      }),
      "Upload middleware error",
    );

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Uploaded file is too large",
        data: {},
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid upload request",
      data: {},
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (prismaUnavailableErrorCodes.has(error.code)) {
      errorLogger.error(
        sanitizeLogMetadata({
          ...requestMetadata,
          statusCode: 503,
          prismaCode: error.code,
          error: serializeError(error),
        }),
        "Database is unavailable",
      );

      return res.status(503).json({
        success: false,
        message: "Database is temporarily unavailable. Please try again shortly.",
        data: {
          code: "DATABASE_UNAVAILABLE",
        },
      });
    }

    if (error.code === "P2002") {
      errorLogger.warn(
        sanitizeLogMetadata({
          ...requestMetadata,
          statusCode: 409,
          prismaCode: error.code,
          target: error.meta?.target,
        }),
        "Unique constraint conflict",
      );

      return res.status(409).json({
        success: false,
        message: "Resource already exists",
        data: {
          target: error.meta?.target,
        },
      });
    }

    if (error.code === "P2025") {
      errorLogger.warn(
        sanitizeLogMetadata({
          ...requestMetadata,
          statusCode: 404,
          prismaCode: error.code,
          cause: error.meta?.cause,
        }),
        "Record not found",
      );

      return res.status(404).json({
        success: false,
        message: "Resource not found",
        data: {},
      });
    }

    if (error.code === "P2003" || error.code === "P2014") {
      errorLogger.warn(
        sanitizeLogMetadata({
          ...requestMetadata,
          statusCode: 409,
          prismaCode: error.code,
          field: error.meta?.field_name,
        }),
        "Foreign key / relation constraint violation",
      );

      return res.status(409).json({
        success: false,
        message: "Operation conflicts with related data",
        data: {},
      });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    errorLogger.warn(
      sanitizeLogMetadata({
        ...requestMetadata,
        statusCode: 400,
        error: serializeError(error),
      }),
      "Prisma validation failure",
    );

    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      data: {},
    });
  }

  errorLogger.error(
    sanitizeLogMetadata({
      ...requestMetadata,
      statusCode: 500,
      error: serializeError(error),
    }),
    "Unhandled backend error",
  );

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    data: {},
  });
};

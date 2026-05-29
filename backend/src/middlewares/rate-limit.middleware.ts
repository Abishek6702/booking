import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const resolveRateLimitKey = (req: Request): string => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  // Use the helper to safely normalize IPv4/IPv6 key generation.
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
};

interface ScopedLimiterConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

const createScopedLimiter = ({ windowMs, maxRequests, message }: ScopedLimiterConfig) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveRateLimitKey,
    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        message,
        data: {
          code: "RATE_LIMIT_EXCEEDED",
        },
      });
    },
  });
};

const authWindowMs = parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000);
const authMaxRequests = parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 5);

const bookingWindowMs = parsePositiveInteger(process.env.BOOKING_RATE_LIMIT_WINDOW_MS, 60_000);
const bookingMaxRequests = parsePositiveInteger(process.env.BOOKING_RATE_LIMIT_MAX, 20);

const searchWindowMs = parsePositiveInteger(process.env.SEARCH_RATE_LIMIT_WINDOW_MS, 60_000);
const searchMaxRequests = parsePositiveInteger(process.env.SEARCH_RATE_LIMIT_MAX, 120);

export const authRateLimiter = createScopedLimiter({
  windowMs: authWindowMs,
  maxRequests: authMaxRequests,
  message: "Too many authentication requests. Please wait before trying again.",
});

export const bookingRateLimiter = createScopedLimiter({
  windowMs: bookingWindowMs,
  maxRequests: bookingMaxRequests,
  message: "Too many booking requests. Please slow down and retry shortly.",
});

export const searchRateLimiter = createScopedLimiter({
  windowMs: searchWindowMs,
  maxRequests: searchMaxRequests,
  message: "Too many search requests. Please wait and try again.",
});

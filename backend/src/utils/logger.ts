import pino, { LoggerOptions } from "pino";

type JsonLike = Record<string, unknown>;

const sensitiveKeyPattern = /(password|token|authorization|cookie|secret|api[_-]?key|refresh)/i;

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

const logLevel =
  process.env.LOG_LEVEL ??
  (isProduction ? "info" : "debug");

const baseLoggerOptions: LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: process.env.SERVICE_NAME ?? "travelmate-backend",
    environment: process.env.NODE_ENV ?? "development",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
};

const createLogger = () => {
  if (isDevelopment) {
    const prettyTransport = pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    });

    return pino(baseLoggerOptions, prettyTransport);
  }

  return pino(baseLoggerOptions);
};

const isPlainObject = (value: unknown): value is JsonLike => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: JsonLike = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
};

export const sanitizeLogMetadata = (metadata: JsonLike): JsonLike => {
  return sanitizeValue(metadata) as JsonLike;
};

export const serializeError = (error: unknown): JsonLike => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: String(error),
  };
};

export const logger = createLogger();

export const getLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

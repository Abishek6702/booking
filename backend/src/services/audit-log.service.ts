import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

type JsonRecord = Record<string, unknown>;

interface AuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: JsonRecord;
}

const sensitiveKeyPattern = /(password|token|authorization|cookie|secret|api[_-]?key|refresh|otp)/i;
const maxMetadataLength = 16_000;

const isPlainObject = (value: unknown): value is JsonRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const sanitizeMetadataValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadataValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: JsonRecord = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeMetadataValue(nestedValue);
  }

  return sanitized;
};

const toJsonValue = (metadata: JsonRecord): Prisma.InputJsonValue => {
  const serialized = JSON.stringify(sanitizeMetadataValue(metadata));

  if (serialized.length <= maxMetadataLength) {
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }

  return {
    truncated: true,
    originalLength: serialized.length,
    preview: serialized.slice(0, maxMetadataLength),
  } as Prisma.InputJsonObject;
};

export const writeAuditLog = async (db: DbClient, input: AuditLogInput) => {
  const entityId = input.entityId.trim();

  if (!entityId) {
    return null;
  }

  return db.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId,
      metadata: input.metadata ? toJsonValue(input.metadata) : Prisma.JsonNull,
    },
    select: {
      id: true,
    },
  });
};

export const buildBeforeAfterMetadata = (before: JsonRecord, after: JsonRecord): JsonRecord => {
  return {
    before,
    after,
  };
};

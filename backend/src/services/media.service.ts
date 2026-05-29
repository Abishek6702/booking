import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";

const mediaLogger = getLogger("services.media");

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/** Entity categories for directory routing. */
export type MediaEntityType = "stay" | "vehicle" | "attraction" | "user" | "ticket";
export type MediaVisibility = "public" | "private";

const ENTITY_DIRS: Record<MediaEntityType, string> = {
  stay: "stays",
  vehicle: "vehicles",
  attraction: "attractions",
  user: "users",
  ticket: "tickets",
};

// ────────────────────────────────────────────────────────────────────────────
// File naming
//
// Filenames are SHORT and descriptive. The entity context (type + id + name)
// is already encoded in the directory path, so repeating it in the filename
// would be redundant.
//
// Format: <slug>-<shortId>.<ext>
// Example: pool-view-a82f91.jpg
// ────────────────────────────────────────────────────────────────────────────

const slugify = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "file";

const shortId = (): string => randomBytes(3).toString("hex");

/**
 * Build a composite folder name that includes both the stable entity ID and
 * a human-readable slug derived from the entity name.
 *
 * Format: <entityId>-<slugified-name>
 * Example: cm1abc123-beach-villa
 *
 * Rules:
 *   - Always starts with the full entity ID (stable, unique)
 *   - Followed by a slugified version of the entity name (readable)
 *   - If no name is provided, falls back to just the ID
 *   - Once created, the folder is NEVER renamed (the ID prefix guarantees
 *     uniqueness even if the entity name changes later)
 *   - URL-safe, lowercase, no special characters
 */
export const buildEntityFolderName = (entityId: string, entityName?: string): string => {
  if (!entityName || entityName.trim().length === 0) {
    return entityId;
  }

  const nameSlug = slugify(entityName).slice(0, 30);
  return `${entityId}-${nameSlug}`;
};

export const buildMediaFilename = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const baseName = path.basename(originalName, path.extname(originalName));
  const slug = slugify(baseName);

  return `${slug}-${shortId()}${ext}`;
};

// ────────────────────────────────────────────────────────────────────────────
// Directory resolution
// ────────────────────────────────────────────────────────────────────────────

export const resolveMediaDirectory = (
  entityType: MediaEntityType,
  entityId: string,
  visibility: MediaVisibility,
  entityName?: string,
): string => {
  const folderName = buildEntityFolderName(entityId, entityName);
  const dir = path.join(UPLOADS_ROOT, visibility, ENTITY_DIRS[entityType], folderName);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const buildRelativePath = (
  entityType: MediaEntityType,
  entityId: string,
  visibility: MediaVisibility,
  filename: string,
  entityName?: string,
): string => {
  const folderName = buildEntityFolderName(entityId, entityName);
  return `/uploads/${visibility}/${ENTITY_DIRS[entityType]}/${folderName}/${filename}`;
};

// ────────────────────────────────────────────────────────────────────────────
// Upload destination resolver
//
// Called ONCE per file by the multer storage engine. Returns the directory,
// filename, and relative path. The middleware caches the result on the
// request so the route handler can read it without re-computing.
// ────────────────────────────────────────────────────────────────────────────

export interface UploadContext {
  entityType: MediaEntityType;
  entityId: string;
  entityName?: string | undefined;
  visibility: MediaVisibility;
}

export interface ResolvedUpload {
  directory: string;
  filename: string;
  relativePath: string;
}

export const resolveUploadDestination = (
  context: UploadContext,
  originalName: string,
): ResolvedUpload => {
  const directory = resolveMediaDirectory(context.entityType, context.entityId, context.visibility, context.entityName);
  const filename = buildMediaFilename(originalName);
  const relativePath = buildRelativePath(context.entityType, context.entityId, context.visibility, filename, context.entityName);

  return { directory, filename, relativePath };
};

// ────────────────────────────────────────────────────────────────────────────
// Shared record types
// ────────────────────────────────────────────────────────────────────────────

export interface ImageRecord {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  isCover: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface DocumentRecord {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  label: string | null;
  sortOrder: number;
  createdAt: Date;
}

const imageSelect = {
  id: true, path: true, filename: true, mimeType: true,
  size: true, isCover: true, sortOrder: true, createdAt: true,
} as const;

const documentSelect = {
  id: true, path: true, filename: true, mimeType: true,
  size: true, label: true, sortOrder: true, createdAt: true,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Stay Images
// ────────────────────────────────────────────────────────────────────────────

export const createStayImage = async (input: {
  stayId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  isCover?: boolean;
  sortOrder?: number;
  uploadedById?: string | undefined;
}): Promise<ImageRecord> => {
  return prisma.stayImage.create({
    data: {
      stayId: input.stayId,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      isCover: input.isCover ?? false,
      sortOrder: input.sortOrder ?? 0,
      uploadedById: input.uploadedById ?? null,
    },
    select: imageSelect,
  });
};

export const getStayImages = async (stayId: string): Promise<ImageRecord[]> => {
  return prisma.stayImage.findMany({
    where: { stayId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: imageSelect,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Vehicle Images
// ────────────────────────────────────────────────────────────────────────────

export const createVehicleImage = async (input: {
  vehicleId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  isCover?: boolean;
  sortOrder?: number;
  uploadedById?: string | undefined;
}): Promise<ImageRecord> => {
  return prisma.vehicleImage.create({
    data: {
      vehicleId: input.vehicleId,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      isCover: input.isCover ?? false,
      sortOrder: input.sortOrder ?? 0,
      uploadedById: input.uploadedById ?? null,
    },
    select: imageSelect,
  });
};

export const getVehicleImages = async (vehicleId: string): Promise<ImageRecord[]> => {
  return prisma.vehicleImage.findMany({
    where: { vehicleId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: imageSelect,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Attraction Images
// ────────────────────────────────────────────────────────────────────────────

export const createAttractionImage = async (input: {
  attractionId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  isCover?: boolean;
  sortOrder?: number;
  uploadedById?: string | undefined;
}): Promise<ImageRecord> => {
  return prisma.attractionImage.create({
    data: {
      attractionId: input.attractionId,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      isCover: input.isCover ?? false,
      sortOrder: input.sortOrder ?? 0,
      uploadedById: input.uploadedById ?? null,
    },
    select: imageSelect,
  });
};

export const getAttractionImages = async (attractionId: string): Promise<ImageRecord[]> => {
  return prisma.attractionImage.findMany({
    where: { attractionId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: imageSelect,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// User Avatar
// ────────────────────────────────────────────────────────────────────────────

export const upsertUserAvatar = async (input: {
  userId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedById?: string | undefined;
}) => {
  return prisma.userAvatar.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      uploadedById: input.uploadedById ?? null,
    },
    update: {
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      uploadedById: input.uploadedById ?? null,
      deletedAt: null,
    },
    select: { id: true, path: true, filename: true, mimeType: true, size: true, createdAt: true },
  });
};

export const getUserAvatar = async (userId: string) => {
  return prisma.userAvatar.findUnique({
    where: { userId },
    select: { id: true, path: true, filename: true, mimeType: true, size: true, createdAt: true },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// User Documents (private)
// ────────────────────────────────────────────────────────────────────────────

export const createUserDocument = async (input: {
  userId: string;
  label?: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  sortOrder?: number;
  uploadedById?: string | undefined;
}): Promise<DocumentRecord> => {
  return prisma.userDocument.create({
    data: {
      userId: input.userId,
      label: input.label ?? null,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      sortOrder: input.sortOrder ?? 0,
      uploadedById: input.uploadedById ?? null,
    },
    select: documentSelect,
  });
};

export const getUserDocuments = async (userId: string): Promise<DocumentRecord[]> => {
  return prisma.userDocument.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: documentSelect,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Ticket Attachments (private)
// ────────────────────────────────────────────────────────────────────────────

export const createTicketAttachment = async (input: {
  ticketId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  sortOrder?: number;
  uploadedById?: string | undefined;
}) => {
  return prisma.ticketAttachment.create({
    data: {
      ticketId: input.ticketId,
      path: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      sortOrder: input.sortOrder ?? 0,
      uploadedById: input.uploadedById ?? null,
    },
    select: { id: true, path: true, filename: true, mimeType: true, size: true, sortOrder: true, createdAt: true },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Soft delete
// ────────────────────────────────────────────────────────────────────────────

export const softDeleteStayImage = (imageId: string) =>
  prisma.stayImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });

export const softDeleteVehicleImage = (imageId: string) =>
  prisma.vehicleImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });

export const softDeleteAttractionImage = (imageId: string) =>
  prisma.attractionImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });

// ────────────────────────────────────────────────────────────────────────────
// Ensure base directories exist at module load
// ────────────────────────────────────────────────────────────────────────────

fs.mkdirSync(path.join(UPLOADS_ROOT, "public"), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_ROOT, "private"), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_ROOT, "temp"), { recursive: true });

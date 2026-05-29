import multer from "multer";
import { Request } from "express";

import { ApiError } from "../utils/error.util";
import {
  resolveUploadDestination,
  type MediaEntityType,
  type MediaVisibility,
  type UploadContext,
  type ResolvedUpload,
} from "../services/media.service";

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const parsedMaxFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES);
const parsedMaxFiles = Number(process.env.UPLOAD_MAX_FILES);

export const maxUploadFileSizeBytes =
  Number.isFinite(parsedMaxFileSize) && parsedMaxFileSize > 0
    ? parsedMaxFileSize
    : 5 * 1024 * 1024;

export const maxUploadFiles =
  Number.isFinite(parsedMaxFiles) && parsedMaxFiles > 0
    ? Math.min(parsedMaxFiles, 20)
    : 10;

// ────────────────────────────────────────────────────────────────────────────
// MIME type allow-list
// ────────────────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
  "application/pdf",
]);

// ────────────────────────────────────────────────────────────────────────────
// Upload context on request
// ────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      uploadContext?: UploadContext;
      /** Cached resolved upload info per file (set by the storage engine). */
      _resolvedUploads?: Map<string, ResolvedUpload>;
    }
  }
}

const VALID_ENTITY_TYPES: MediaEntityType[] = ["stay", "vehicle", "attraction", "user", "ticket"];

const resolveVisibility = (entityType: MediaEntityType, isDocument: boolean): MediaVisibility => {
  if (isDocument) return "private";
  if (entityType === "ticket") return "private";
  return "public";
};

/**
 * Middleware that sets `req.uploadContext` from body/query params.
 * Must run BEFORE the multer middleware.
 */
export const setUploadContext = (defaultVisibility?: MediaVisibility) => {
  return (req: Request, _res: unknown, next: (err?: unknown) => void): void => {
    const entityType = String(req.body?.entityType ?? req.query?.entityType ?? "").toLowerCase();
    const entityId = String(req.body?.entityId ?? req.query?.entityId ?? "").trim();
    const entityName = String(req.body?.entityName ?? req.query?.entityName ?? "").trim() || undefined;
    const isDocument = String(req.body?.isDocument ?? req.query?.isDocument ?? "false") === "true";

    if (!entityType || !entityId) {
      next(new ApiError(400, "entityType and entityId are required for uploads"));
      return;
    }

    if (!VALID_ENTITY_TYPES.includes(entityType as MediaEntityType)) {
      next(new ApiError(400, `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`));
      return;
    }

    const visibility = defaultVisibility ?? resolveVisibility(entityType as MediaEntityType, isDocument);

    req.uploadContext = {
      entityType: entityType as MediaEntityType,
      entityId,
      entityName,
      visibility,
    };

    next();
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Entity-aware multer storage engine
//
// Resolves the destination ONCE per file and caches the result on the request
// so the route handler can read the exact filename/path that was written.
// ────────────────────────────────────────────────────────────────────────────

const getOrResolve = (req: Request, originalName: string): ResolvedUpload => {
  const context = req.uploadContext;
  if (!context) {
    throw new ApiError(400, "Upload context not set");
  }

  if (!req._resolvedUploads) {
    req._resolvedUploads = new Map();
  }

  // Use originalName as key so each file in a multi-upload gets its own resolution
  const existing = req._resolvedUploads.get(originalName);
  if (existing) return existing;

  const resolved = resolveUploadDestination(context, originalName);
  req._resolvedUploads.set(originalName, resolved);
  return resolved;
};

const entityAwareStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { directory } = getOrResolve(req as Request, file.originalname);
      cb(null, directory);
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (req, file, cb) => {
    try {
      const { filename } = getOrResolve(req as Request, file.originalname);
      cb(null, filename);
    } catch (err) {
      cb(err as Error, "");
    }
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(new ApiError(400, "Only image files (JPEG, PNG, WebP, GIF) and PDFs are allowed"));
    return;
  }
  cb(null, true);
};

export const mediaUploader = multer({
  storage: entityAwareStorage,
  fileFilter,
  limits: {
    fileSize: maxUploadFileSizeBytes,
    files: maxUploadFiles,
  },
});

export const mediaUploadSingle = mediaUploader.single("file");
export const mediaUploadMultiple = mediaUploader.array("files", maxUploadFiles);

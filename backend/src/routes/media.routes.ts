import { Router, Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";

import { authenticate } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import * as mediaService from "../services/media.service";
import {
  setUploadContext,
  mediaUploadSingle,
  mediaUploadMultiple,
} from "../middlewares/media-upload.middleware";

const router = Router();

router.use(authenticate);

// ────────────────────────────────────────────────────────────────────────────
// Helper: extract the resolved relative path for a multer-written file
// ────────────────────────────────────────────────────────────────────────────

const getResolvedPath = (req: Request, file: Express.Multer.File): string => {
  const resolved = req._resolvedUploads?.get(file.originalname);
  if (resolved) return resolved.relativePath;

  // Fallback: reconstruct from the upload context + written filename
  const ctx = req.uploadContext!;
  return mediaService.buildRelativePath(ctx.entityType, ctx.entityId, ctx.visibility, file.filename, ctx.entityName);
};

// ────────────────────────────────────────────────────────────────────────────
// Upload endpoints
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/media/upload
 * Upload a single file for a specific entity.
 * Body (multipart): file, entityType, entityId, isDocument (optional)
 */
router.post(
  "/upload",
  setUploadContext(),
  asyncHandler(async (req: Request, res: Response) => {
    await new Promise<void>((resolve, reject) => {
      mediaUploadSingle(req, res, (err) => (err ? reject(err) : resolve()));
    });

    if (!req.file) {
      throw new ApiError(400, "No file uploaded. Use form-data field name 'file'");
    }

    const context = req.uploadContext!;
    const relativePath = getResolvedPath(req, req.file);

    const baseInput = {
      path: relativePath,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedById: req.user?.id,
    };

    let record;
    switch (context.entityType) {
      case "stay":
        record = await mediaService.createStayImage({ stayId: context.entityId, ...baseInput });
        break;
      case "vehicle":
        record = await mediaService.createVehicleImage({ vehicleId: context.entityId, ...baseInput });
        break;
      case "attraction":
        record = await mediaService.createAttractionImage({ attractionId: context.entityId, ...baseInput });
        break;
      case "user":
        if (context.visibility === "private") {
          record = await mediaService.createUserDocument({ userId: context.entityId, ...baseInput });
        } else {
          record = await mediaService.upsertUserAvatar({ userId: context.entityId, ...baseInput });
        }
        break;
      case "ticket":
        record = await mediaService.createTicketAttachment({ ticketId: context.entityId, ...baseInput });
        break;
      default:
        throw new ApiError(400, `Unsupported entity type: ${context.entityType}`);
    }

    sendSuccess(res, "File uploaded successfully", { file: record }, 201);
  }),
);

/**
 * POST /api/v1/media/upload/multiple
 */
router.post(
  "/upload/multiple",
  setUploadContext(),
  asyncHandler(async (req: Request, res: Response) => {
    await new Promise<void>((resolve, reject) => {
      mediaUploadMultiple(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new ApiError(400, "No files uploaded. Use form-data field name 'files'");
    }

    const context = req.uploadContext!;
    const records = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const relativePath = getResolvedPath(req, file);

      const baseInput = {
        path: relativePath,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        sortOrder: i,
        uploadedById: req.user?.id,
      };

      let record;
      switch (context.entityType) {
        case "stay":
          record = await mediaService.createStayImage({ stayId: context.entityId, ...baseInput, isCover: i === 0 });
          break;
        case "vehicle":
          record = await mediaService.createVehicleImage({ vehicleId: context.entityId, ...baseInput, isCover: i === 0 });
          break;
        case "attraction":
          record = await mediaService.createAttractionImage({ attractionId: context.entityId, ...baseInput, isCover: i === 0 });
          break;
        case "user":
          record = await mediaService.createUserDocument({ userId: context.entityId, ...baseInput });
          break;
        case "ticket":
          record = await mediaService.createTicketAttachment({ ticketId: context.entityId, ...baseInput });
          break;
        default:
          throw new ApiError(400, `Unsupported entity type: ${context.entityType}`);
      }
      records.push(record);
    }

    sendSuccess(res, "Files uploaded successfully", { files: records }, 201);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// Private file access — requires auth + ownership check
// ────────────────────────────────────────────────────────────────────────────

router.get(
  "/private/:entityType/:entityId/:filename",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const entityType = String(req.params.entityType);
    const entityId = String(req.params.entityId);
    const filename = String(req.params.filename);

    // Ownership: user docs belong to the user; tickets belong to the ticket owner
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = entityId === userId;

    if (!isOwner && !isAdmin) {
      if (entityType === "tickets") {
        const ticket = await prisma.ticket.findUnique({
          where: { id: entityId },
          select: { userId: true },
        });
        if (!ticket || ticket.userId !== userId) {
          throw new ApiError(403, "You are not allowed to access this file");
        }
      } else {
        throw new ApiError(403, "You are not allowed to access this file");
      }
    }

    const absolutePath = path.join(mediaService.UPLOADS_ROOT, "private", entityType, entityId, filename);

    // Path traversal protection
    const privateRoot = path.join(mediaService.UPLOADS_ROOT, "private");
    if (!absolutePath.startsWith(privateRoot)) {
      throw new ApiError(403, "Invalid file path");
    }

    if (!fs.existsSync(absolutePath)) {
      throw new ApiError(404, "File not found");
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
    };

    res.setHeader("Content-Type", mimeMap[ext] ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
    res.sendFile(absolutePath);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// Query endpoints
// ────────────────────────────────────────────────────────────────────────────

router.get("/stays/:stayId", asyncHandler(async (req: Request, res: Response) => {
  const images = await mediaService.getStayImages(String(req.params.stayId));
  sendSuccess(res, "Stay images fetched", images);
}));

router.get("/vehicles/:vehicleId", asyncHandler(async (req: Request, res: Response) => {
  const images = await mediaService.getVehicleImages(String(req.params.vehicleId));
  sendSuccess(res, "Vehicle images fetched", images);
}));

router.get("/attractions/:attractionId", asyncHandler(async (req: Request, res: Response) => {
  const images = await mediaService.getAttractionImages(String(req.params.attractionId));
  sendSuccess(res, "Attraction images fetched", images);
}));

// ────────────────────────────────────────────────────────────────────────────
// Delete endpoints (soft delete)
// ────────────────────────────────────────────────────────────────────────────

router.delete("/stays/images/:imageId", asyncHandler(async (req: Request, res: Response) => {
  await mediaService.softDeleteStayImage(String(req.params.imageId));
  sendSuccess(res, "Image deleted", {});
}));

router.delete("/vehicles/images/:imageId", asyncHandler(async (req: Request, res: Response) => {
  await mediaService.softDeleteVehicleImage(String(req.params.imageId));
  sendSuccess(res, "Image deleted", {});
}));

router.delete("/attractions/images/:imageId", asyncHandler(async (req: Request, res: Response) => {
  await mediaService.softDeleteAttractionImage(String(req.params.imageId));
  sendSuccess(res, "Image deleted", {});
}));

export default router;

import { Request, Response } from "express";

import { uploadMultipleMiddleware, uploadSingleMiddleware } from "../middlewares/upload.middleware";
import * as uploadService from "../services/upload.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";

const runUploadMiddleware = (
  req: Request,
  res: Response,
  middleware: (req: Request, res: Response, next: (error?: unknown) => void) => void,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    middleware(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

export const uploadSingle = asyncHandler(async (req: Request, res: Response) => {
  await runUploadMiddleware(req, res, uploadSingleMiddleware);

  if (!req.file) {
    throw new ApiError(400, "No file uploaded. Use form-data field name 'file'");
  }

  const data = {
    file: uploadService.toUploadedFilePayload(req, req.file),
  };

  sendSuccess(res, "File uploaded successfully", data, 201);
});

export const uploadMultiple = asyncHandler(async (req: Request, res: Response) => {
  await runUploadMiddleware(req, res, uploadMultipleMiddleware);

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new ApiError(400, "No files uploaded. Use form-data field name 'files'");
  }

  const data = {
    files: uploadService.toUploadedFilesPayload(req, files),
  };

  sendSuccess(res, "Files uploaded successfully", data, 201);
});

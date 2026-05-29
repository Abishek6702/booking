import { Request } from "express";

import { uploadPublicBasePath } from "../middlewares/upload.middleware";

export interface UploadedFilePayload {
  fileUrl: string;
  filename: string;
  mimetype: string;
  size: number;
}

const getRequestBaseUrl = (req: Request): string => {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto && forwardedProto.length > 0 ? forwardedProto : req.protocol;
  const host = req.get("host") ?? "localhost";

  return `${protocol}://${host}`;
};

const buildFileUrl = (req: Request, filename: string): string => {
  return `${getRequestBaseUrl(req)}${uploadPublicBasePath}/${encodeURIComponent(filename)}`;
};

export const toUploadedFilePayload = (
  req: Request,
  file: Express.Multer.File,
): UploadedFilePayload => {
  return {
    fileUrl: buildFileUrl(req, file.filename),
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
  };
};

export const toUploadedFilesPayload = (
  req: Request,
  files: Express.Multer.File[],
): UploadedFilePayload[] => {
  return files.map((file) => toUploadedFilePayload(req, file));
};

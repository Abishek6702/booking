import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";

import { ApiError } from "../utils/error.util";

const defaultMaxFileSizeBytes = 5 * 1024 * 1024;
const defaultMaxFiles = 10;

const parsedMaxFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES);
const parsedMaxFiles = Number(process.env.UPLOAD_MAX_FILES);

export const maxUploadFileSizeBytes =
  Number.isFinite(parsedMaxFileSize) && parsedMaxFileSize > 0
    ? parsedMaxFileSize
    : defaultMaxFileSizeBytes;

export const maxUploadFiles =
  Number.isFinite(parsedMaxFiles) && parsedMaxFiles > 0
    ? Math.min(parsedMaxFiles, 20)
    : defaultMaxFiles;

export const uploadDirectory = path.resolve(process.cwd(), "uploads");
export const uploadPublicBasePath = "/uploads";

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
  "application/pdf",
]);

const toSafeBasename = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();
  const rawBasename = path.basename(originalName, extension);

  const safeBasename = rawBasename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safeBasename || "file";
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBasename = toSafeBasename(file.originalname);

    cb(null, `${Date.now()}-${randomUUID()}-${safeBasename}${extension}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype.toLowerCase())) {
    cb(new ApiError(400, "Only image files and PDFs are allowed"));
    return;
  }

  cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxUploadFileSizeBytes,
    files: maxUploadFiles,
  },
});

export const uploadSingleMiddleware = uploader.single("file");
export const uploadMultipleMiddleware = uploader.array("files", maxUploadFiles);

export const uploadOwnerDocsMiddleware = uploader.fields([
  { name: "businessLicense", maxCount: 1 },
  { name: "tourismRegistration", maxCount: 1 },
  { name: "gstCertificate", maxCount: 1 },
  { name: "propertyOwnershipProof", maxCount: 1 },
  { name: "governmentId", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
]);

const excelUploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only .xlsx, .xls and .csv files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadExcelMiddleware = excelUploader.single("file");

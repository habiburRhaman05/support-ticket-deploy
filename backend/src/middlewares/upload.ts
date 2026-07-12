import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { badRequest } from "../utils/appError";
import { env } from "../utils/envConfig";

/**
 * In-memory multipart parsing for attachments — the buffer is then streamed to
 * Cloudinary (or written to local disk) by the storage service. Memory storage
 * keeps the upload pipeline storage-agnostic and avoids temp-file cleanup.
 */

// Images, PDFs, plain text, and common office/doc types — screenshots are the
// main use case, so images are first-class.
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
}).array("files", 8);

/** Multipart parser that maps multer/filter errors to clean 400 responses. */
export function uploadAttachments(req: Request, res: Response, next: NextFunction) {
  parser(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Each file must be ${env.MAX_UPLOAD_MB}MB or smaller`
          : err.code === "LIMIT_FILE_COUNT"
            ? "Too many files (max 8 per upload)"
            : err.message;
      return next(badRequest(message, "UPLOAD_ERROR"));
    }
    return next(badRequest(err instanceof Error ? err.message : "Upload failed", "UPLOAD_ERROR"));
  });
}

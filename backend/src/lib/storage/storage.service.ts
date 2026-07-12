import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../utils/envConfig";

/**
 * File-storage abstraction for ticket/reply attachments.
 *
 * Primary target is Cloudinary (chosen by the client). When Cloudinary env
 * vars are absent it transparently falls back to writing files under
 * ./uploads and serving them statically, so the upload/preview flow is fully
 * testable before real keys arrive — no code change needed to switch, just env.
 */

export interface StoredFile {
  url: string;
  storageKey: string;
  provider: "cloudinary" | "local";
}

// Local fallback: files live under <backend>/uploads and are served at /uploads.
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

let cloudinaryReady = false;
function ensureCloudinary() {
  if (cloudinaryReady) return;
  if (env.CLOUDINARY_URL) {
    // The SDK reads CLOUDINARY_URL from the environment automatically, but we
    // configure explicitly so it works regardless of load order.
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  cloudinaryReady = true;
}

function safeName(originalName: string): string {
  const base = path.basename(originalName).replace(/[^\w.\-]+/g, "_");
  return `${crypto.randomUUID()}-${base}`.slice(0, 200);
}

async function uploadToCloudinary(buffer: Buffer, originalName: string): Promise<StoredFile> {
  ensureCloudinary();
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ghl-support-tickets",
        resource_type: "auto",
        public_id: safeName(originalName).replace(/\.[^.]+$/, ""),
        use_filename: true,
        unique_filename: true,
      },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve({ secure_url: res.secure_url, public_id: res.public_id });
      },
    );
    stream.end(buffer);
  });

  return { url: result.secure_url, storageKey: result.public_id, provider: "cloudinary" };
}

async function uploadToLocalDisk(buffer: Buffer, originalName: string): Promise<StoredFile> {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = safeName(originalName);
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
  return {
    url: `${env.publicBaseUrl}/uploads/${fileName}`,
    storageKey: fileName,
    provider: "local",
  };
}

export const storageService = {
  /** Upload one file's bytes and return its public URL + storage key. */
  async upload(buffer: Buffer, originalName: string): Promise<StoredFile> {
    if (env.isCloudinaryConfigured) return uploadToCloudinary(buffer, originalName);
    // Serverless (Vercel) filesystems are read-only/ephemeral — a local-disk
    // "upload" would 500 or silently vanish. Fail loudly instead.
    if (env.isProduction) {
      throw new Error(
        "Attachment storage is not configured: set the CLOUDINARY_* environment variables in production (local-disk fallback is dev-only).",
      );
    }
    return uploadToLocalDisk(buffer, originalName);
  },

  /** Best-effort delete — never throws (attachment DB row is the source of truth). */
  async remove(file: { provider: string; storageKey: string }): Promise<void> {
    try {
      if (file.provider === "cloudinary") {
        ensureCloudinary();
        await cloudinary.uploader.destroy(file.storageKey, { resource_type: "auto" });
      } else {
        await fs.promises.unlink(path.join(UPLOAD_DIR, file.storageKey)).catch(() => {});
      }
    } catch {
      /* swallow — cleanup is best-effort */
    }
  },

  uploadDir: UPLOAD_DIR,
};

/**
 * S3 Storage Client
 *
 * Handles file uploads, downloads, and deletion using S3-compatible storage
 * Compatible with AWS S3, iDrive e2, Backblaze B2, MinIO, etc.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Configuration
const s3Config = {
  endpoint: process.env.S3_ENDPOINT ? `https://${process.env.S3_ENDPOINT}` : undefined,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Required for some S3-compatible services
};

// Create S3 client
export const s3Client = new S3Client(s3Config);

// Bucket name
export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "lms";

// Max file size (default 50MB)
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "52428800", 10);

/**
 * File upload options
 */
export interface UploadOptions {
  folder?: string; // Optional folder prefix (e.g., "avatars", "courses/videos")
  contentType?: string; // MIME type
  metadata?: Record<string, string>; // Custom metadata
  public?: boolean; // Whether file should be publicly accessible
}

/**
 * Upload result
 */
export interface UploadResult {
  key: string; // S3 object key
  url: string; // Public URL or signed URL
  bucket: string;
  size: number;
  contentType?: string;
}

/**
 * Generate a unique file key
 */
function generateFileKey(filename: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${timestamp}-${random}-${sanitizedFilename}`;

  return folder ? `${folder}/${key}` : key;
}

/**
 * Upload a file to S3
 *
 * @param file - File buffer or stream
 * @param filename - Original filename
 * @param options - Upload options
 * @returns Upload result with URL
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  filename: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder, contentType, metadata, public: isPublic = false } = options;

  // Generate unique key
  const key = generateFileKey(filename, folder);

  // Upload command
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: metadata,
    ACL: isPublic ? "public-read" : "private",
  });

  // Upload to S3
  await s3Client.send(command);

  // Generate URL
  let url: string;
  if (isPublic && process.env.S3_PUBLIC_URL) {
    // Use CDN URL if configured
    url = `${process.env.S3_PUBLIC_URL}/${key}`;
  } else if (isPublic) {
    // Use S3 endpoint URL
    url = `https://${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
  } else {
    // Generate signed URL for private files (valid for 1 hour)
    url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), {
      expiresIn: 3600,
    });
  }

  return {
    key,
    url,
    bucket: BUCKET_NAME,
    size: file.byteLength,
    contentType,
  };
}

/**
 * Delete a file from S3
 *
 * @param key - S3 object key
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Check if a file exists in S3
 *
 * @param key - S3 object key
 * @returns True if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a presigned URL for downloading a file
 *
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file directly from client
 *
 * @param filename - Original filename
 * @param contentType - MIME type
 * @param folder - Optional folder prefix
 * @param expiresIn - Expiration time in seconds (default: 5 minutes)
 * @returns Presigned upload URL and key
 */
export async function getUploadUrl(
  filename: string,
  contentType: string,
  folder?: string,
  expiresIn: number = 300
): Promise<{ url: string; key: string }> {
  const key = generateFileKey(filename, folder);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return { url, key };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * File Upload tRPC Router
 *
 * Handles file upload operations:
 * - Get presigned upload URLs
 * - Delete uploaded files
 * - Get download URLs
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  getUploadUrl,
  getDownloadUrl,
  deleteFile,
  fileExists,
  validateFileSize,
  formatFileSize,
  MAX_FILE_SIZE,
} from "@/lib/storage/s3";

/**
 * Allowed file types for different upload contexts
 */
const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
  any: ["*/*"],
};

export const uploadRouter = createTRPCRouter({
  /**
   * Get a presigned URL for uploading a file
   * Client will use this URL to upload directly to S3
   */
  getUploadUrl: publicProcedure
    .input(
      z.object({
        filename: z.string().min(1, "Filename is required"),
        contentType: z.string().min(1, "Content type is required"),
        size: z.number().positive("File size must be positive"),
        folder: z.enum(["avatars", "courses", "lessons", "assignments", "temp"]).optional(),
        fileType: z.enum(["image", "video", "document", "audio", "any"]).default("any"),
      })
    )
    .mutation(async ({ input }) => {
      const { filename, contentType, size, folder, fileType } = input;

      // Validate file size
      if (!validateFileSize(size)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File size exceeds maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`,
        });
      }

      // Validate content type
      const allowedTypes = ALLOWED_TYPES[fileType];
      if (!allowedTypes.includes("*/*") && !allowedTypes.includes(contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File type ${contentType} is not allowed for ${fileType} uploads`,
        });
      }

      try {
        // Generate presigned upload URL (valid for 5 minutes)
        const { url, key } = await getUploadUrl(filename, contentType, folder, 300);

        return {
          uploadUrl: url,
          key,
          expiresIn: 300,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
          cause: error,
        });
      }
    }),

  /**
   * Get a presigned URL for downloading a file
   */
  getDownloadUrl: publicProcedure
    .input(
      z.object({
        key: z.string().min(1, "File key is required"),
        expiresIn: z.number().min(60).max(604800).default(3600), // 1 min to 7 days
      })
    )
    .query(async ({ input }) => {
      const { key, expiresIn } = input;

      // Check if file exists
      const exists = await fileExists(key);
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      try {
        const url = await getDownloadUrl(key, expiresIn);

        return {
          downloadUrl: url,
          expiresIn,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL",
          cause: error,
        });
      }
    }),

  /**
   * Delete an uploaded file
   */
  deleteFile: publicProcedure
    .input(
      z.object({
        key: z.string().min(1, "File key is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { key } = input;

      try {
        // Check if file exists
        const exists = await fileExists(key);
        if (!exists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        // Delete file
        await deleteFile(key);

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
          cause: error,
        });
      }
    }),

  /**
   * Check if a file exists
   */
  checkFile: publicProcedure
    .input(
      z.object({
        key: z.string().min(1, "File key is required"),
      })
    )
    .query(async ({ input }) => {
      const { key } = input;

      try {
        const exists = await fileExists(key);

        return {
          exists,
          key,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check file existence",
          cause: error,
        });
      }
    }),
});

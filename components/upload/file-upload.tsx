/**
 * File Upload Component
 *
 * Example component showing how to upload files using presigned URLs
 * Usage: Adapt this for avatars, course materials, assignments, etc.
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface FileUploadProps {
  folder?: "avatars" | "courses" | "lessons" | "assignments" | "temp";
  fileType?: "image" | "video" | "document" | "audio" | "any";
  onUploadComplete?: (key: string, url: string) => void;
  onUploadError?: (error: string) => void;
}

export function FileUpload({
  folder = "temp",
  fileType = "any",
  onUploadComplete,
  onUploadError,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  // Get upload URL mutation
  const getUploadUrlMutation = trpc.upload.getUploadUrl.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedKey(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      // Step 1: Get presigned upload URL from backend
      const { uploadUrl, key } = await getUploadUrlMutation.mutateAsync({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        size: selectedFile.size,
        folder,
        fileType,
      });

      // Step 2: Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Success! File is now in S3
      setUploadedKey(key);
      onUploadComplete?.(key, uploadUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      onUploadError?.(errorMessage);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
          Select File
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:rounded-md file:border-0
            file:bg-blue-50 file:px-4 file:py-2
            file:text-sm file:font-semibold file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
      </div>

      {selectedFile && (
        <div className="text-sm text-gray-600">
          <p>Selected: {selectedFile.name}</p>
          <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploadedKey && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            ✓ File uploaded successfully!
            <br />
            Key: <code className="text-xs">{uploadedKey}</code>
          </p>
        </div>
      )}
    </div>
  );
}

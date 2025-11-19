"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CreateAnnouncementFormProps {
  courseId: string;
}

export function CreateAnnouncementForm({ courseId }: CreateAnnouncementFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [publishNow, setPublishNow] = useState(false);

  const createAnnouncementMutation = trpc.announcement.createAnnouncement.useMutation({
    onSuccess: () => {
      router.push(`/courses/${courseId}/announcements`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      return;
    }

    await createAnnouncementMutation.mutateAsync({
      courseId,
      title,
      content,
      priority,
      publishNow,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/courses/${courseId}/announcements`)}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to Announcements
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Announcement</h1>
        <p className="mt-2 text-gray-600">Create an announcement for your course students</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title..."
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
              required
            />
            <p className="mt-1 text-sm text-gray-500">{title.length}/200 characters</p>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              High priority announcements will be highlighted
            </p>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement content..."
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              required
            />
          </div>

          {/* Publish Now */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="publishNow"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="publishNow" className="ml-2 block text-sm text-gray-700">
              Publish immediately (otherwise save as draft)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createAnnouncementMutation.isPending || !title.trim() || !content.trim()}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {createAnnouncementMutation.isPending
                ? "Creating..."
                : publishNow
                  ? "Publish Announcement"
                  : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/courses/${courseId}/announcements`)}
              className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {/* Error */}
          {createAnnouncementMutation.error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{createAnnouncementMutation.error.message}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

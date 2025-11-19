"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CreateDiscussionFormProps {
  courseId: string;
  lessonId?: string;
}

export function CreateDiscussionForm({ courseId, lessonId }: CreateDiscussionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createDiscussionMutation = trpc.discussion.createDiscussion.useMutation({
    onSuccess: (data) => {
      router.push(`/courses/${courseId}/discussions/${data.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      return;
    }

    await createDiscussionMutation.mutateAsync({
      courseId,
      lessonId,
      title,
      content,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/courses/${courseId}/discussions`)}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to Discussions
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Discussion</h1>
        <p className="mt-2 text-gray-600">Start a conversation with other learners</p>
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
              placeholder="What's your discussion about?"
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
              required
            />
            <p className="mt-1 text-sm text-gray-500">{title.length}/200 characters</p>
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
              placeholder="Provide details about your question or topic..."
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Be clear and descriptive to get better responses
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createDiscussionMutation.isPending || !title.trim() || !content.trim()}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {createDiscussionMutation.isPending ? "Creating..." : "Create Discussion"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/courses/${courseId}/discussions`)}
              className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {/* Error */}
          {createDiscussionMutation.error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{createDiscussionMutation.error.message}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

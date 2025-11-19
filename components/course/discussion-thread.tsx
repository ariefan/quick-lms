"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface DiscussionThreadProps {
  discussionId: string;
  courseId: string;
  isInstructor?: boolean;
}

export function DiscussionThread({
  discussionId,
  courseId,
  isInstructor = false,
}: DiscussionThreadProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: discussion, isLoading } = trpc.discussion.getDiscussionById.useQuery({
    id: discussionId,
  });

  const createReplyMutation = trpc.discussion.createReply.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
      setReplyContent("");
      setReplyingTo(null);
    },
  });

  const togglePinMutation = trpc.discussion.togglePin.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
      utils.discussion.getCourseDiscussions.invalidate({ courseId });
    },
  });

  const toggleCloseMutation = trpc.discussion.toggleClose.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
    },
  });

  const toggleResolveMutation = trpc.discussion.toggleResolve.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
      utils.discussion.getCourseDiscussions.invalidate({ courseId });
    },
  });

  const updateReplyMutation = trpc.discussion.updateReply.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
      setEditingId(null);
      setEditContent("");
    },
  });

  const deleteReplyMutation = trpc.discussion.deleteReply.useMutation({
    onSuccess: () => {
      utils.discussion.getDiscussionById.invalidate({ id: discussionId });
    },
  });

  const handleSubmitReply = async (parentReplyId?: string) => {
    if (!replyContent.trim()) return;

    await createReplyMutation.mutateAsync({
      discussionId,
      content: replyContent,
      parentReplyId,
    });
  };

  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim()) return;

    await updateReplyMutation.mutateAsync({
      id: replyId,
      content: editContent,
    });
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;

    await deleteReplyMutation.mutateAsync({ id: replyId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Discussion not found</h2>
        <p className="mb-4 text-gray-600">The discussion you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push(`/courses/${courseId}/discussions`)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to Discussions
        </button>
      </div>
    );
  }

  // Build nested reply tree
  const buildReplyTree = (replies: any[]) => {
    const replyMap = new Map();
    const rootReplies: any[] = [];

    // First pass: create map of all replies
    replies.forEach((reply) => {
      replyMap.set(reply.id, { ...reply, children: [] });
    });

    // Second pass: build tree structure
    replies.forEach((reply) => {
      const replyWithChildren = replyMap.get(reply.id);
      if (reply.parentReplyId) {
        const parent = replyMap.get(reply.parentReplyId);
        if (parent) {
          parent.children.push(replyWithChildren);
        } else {
          rootReplies.push(replyWithChildren);
        }
      } else {
        rootReplies.push(replyWithChildren);
      }
    });

    return rootReplies;
  };

  const renderReply = (reply: any, depth = 0) => {
    const isEditing = editingId === reply.id;
    const maxDepth = 5;
    const canNest = depth < maxDepth;

    return (
      <div key={reply.id} className={`${depth > 0 ? "ml-8 mt-4" : "mt-6"}`}>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {/* Reply Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {(reply.user.name || reply.user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {reply.user.name || reply.user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(reply.createdAt).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!reply.isDeleted && (
                <>
                  <button
                    onClick={() => {
                      setEditingId(reply.id);
                      setEditContent(reply.content);
                    }}
                    className="text-sm text-gray-600 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    className="text-sm text-gray-600 hover:text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Reply Content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditReply(reply.id)}
                  disabled={updateReplyMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {updateReplyMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditContent("");
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              {canNest && !discussion.isClosed && !reply.isDeleted && (
                <button
                  onClick={() => setReplyingTo(reply.id)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Reply
                </button>
              )}
            </>
          )}

          {/* Reply Form */}
          {replyingTo === reply.id && (
            <div className="mt-4 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmitReply(reply.id)}
                  disabled={createReplyMutation.isPending || !replyContent.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {createReplyMutation.isPending ? "Posting..." : "Post Reply"}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nested Replies */}
        {reply.children && reply.children.length > 0 && (
          <div>{reply.children.map((child: any) => renderReply(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const replyTree = buildReplyTree(discussion.replies || []);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/courses/${courseId}/discussions`)}
        className="text-blue-600 hover:underline"
      >
        ← Back to Discussions
      </button>

      {/* Discussion Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Header with Actions */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            {/* Badges */}
            <div className="mb-3 flex flex-wrap gap-2">
              {discussion.isPinned && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  Pinned
                </span>
              )}
              {discussion.isResolved && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  Resolved
                </span>
              )}
              {discussion.isClosed && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  Closed
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mb-4 text-3xl font-bold text-gray-900">{discussion.title}</h1>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  {(discussion.user.name || discussion.user.email).charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">
                  {discussion.user.name || discussion.user.email}
                </span>
              </div>
              <span>•</span>
              <span>
                {new Date(discussion.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>•</span>
              <span>{discussion.viewCount} views</span>
              <span>•</span>
              <span>{discussion.replyCount} replies</span>
            </div>
          </div>

          {/* Instructor Actions */}
          {isInstructor && (
            <div className="flex gap-2">
              <button
                onClick={() => togglePinMutation.mutate({ id: discussionId })}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                {discussion.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => toggleCloseMutation.mutate({ id: discussionId })}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                {discussion.isClosed ? "Reopen" : "Close"}
              </button>
              <button
                onClick={() => toggleResolveMutation.mutate({ id: discussionId })}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                {discussion.isResolved ? "Unresolve" : "Resolve"}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{discussion.content}</p>
        </div>
      </div>

      {/* Reply Form */}
      {!discussion.isClosed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Add a Reply</h3>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            className="mb-4 w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <button
            onClick={() => handleSubmitReply()}
            disabled={createReplyMutation.isPending || !replyContent.trim()}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {createReplyMutation.isPending ? "Posting..." : "Post Reply"}
          </button>
        </div>
      )}

      {/* Replies */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Replies ({discussion.replyCount})
        </h3>
        {replyTree.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          <div>{replyTree.map((reply) => renderReply(reply))}</div>
        )}
      </div>
    </div>
  );
}

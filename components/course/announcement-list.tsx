"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface AnnouncementListProps {
  courseId: string;
  isInstructor?: boolean;
}

export function AnnouncementList({ courseId, isInstructor = false }: AnnouncementListProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: announcements, isLoading } = trpc.announcement.getCourseAnnouncements.useQuery({
    courseId,
    includeDrafts: isInstructor,
  });

  const publishMutation = trpc.announcement.publishAnnouncement.useMutation({
    onSuccess: () => {
      utils.announcement.getCourseAnnouncements.invalidate({ courseId });
    },
  });

  const unpublishMutation = trpc.announcement.unpublishAnnouncement.useMutation({
    onSuccess: () => {
      utils.announcement.getCourseAnnouncements.invalidate({ courseId });
    },
  });

  const togglePinMutation = trpc.announcement.togglePin.useMutation({
    onSuccess: () => {
      utils.announcement.getCourseAnnouncements.invalidate({ courseId });
    },
  });

  const deleteMutation = trpc.announcement.deleteAnnouncement.useMutation({
    onSuccess: () => {
      utils.announcement.getCourseAnnouncements.invalidate({ courseId });
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    await deleteMutation.mutateAsync({ id });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          <p className="mt-1 text-sm text-gray-600">
            {announcements?.length || 0} {announcements?.length === 1 ? "announcement" : "announcements"}
          </p>
        </div>
        {isInstructor && (
          <button
            onClick={() => router.push(`/courses/${courseId}/announcements/new`)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            New Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      {!announcements || announcements.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No announcements yet</h3>
          <p className="mb-6 text-gray-600">
            {isInstructor
              ? "Create your first announcement to communicate with students"
              : "Your instructor hasn't posted any announcements yet"}
          </p>
          {isInstructor && (
            <button
              onClick={() => router.push(`/courses/${courseId}/announcements/new`)}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Create First Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-lg border-2 p-6 ${
                announcement.isPinned ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              {/* Header with Badges */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getPriorityColor(announcement.priority)}`}
                    >
                      {announcement.priority.toUpperCase()}
                    </span>

                    {/* Status Badges */}
                    {announcement.isPinned && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                        📌 Pinned
                      </span>
                    )}
                    {!announcement.isPublished && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">{announcement.title}</h3>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>{(announcement.user as any).name || (announcement.user as any).email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        {announcement.publishedAt
                          ? new Date(announcement.publishedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : new Date(announcement.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructor Actions */}
                {isInstructor && (
                  <div className="flex gap-2">
                    {announcement.isPublished ? (
                      <button
                        onClick={() => unpublishMutation.mutate({ id: announcement.id })}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => publishMutation.mutate({ id: announcement.id })}
                        className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => togglePinMutation.mutate({ id: announcement.id })}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {announcement.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{announcement.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

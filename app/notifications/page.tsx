"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.notification.getMyNotifications.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    unreadOnly: filter === "unread",
    type: typeFilter as any,
  });

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAsUnreadMutation = trpc.notification.markAsUnread.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteNotificationMutation = trpc.notification.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteAllReadMutation = trpc.notification.deleteAllRead.useMutation({
    onSuccess: () => {
      refetch();
      setPage(0);
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return "📢";
      case "discussion_reply":
        return "💬";
      case "assignment_graded":
        return "📝";
      case "quiz_graded":
        return "✅";
      case "course_enrollment":
        return "👥";
      case "certificate_issued":
        return "🏆";
      case "coupon_created":
        return "🎟️";
      default:
        return "🔔";
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return notifDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: notifDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const handleNotificationClick = async (notification: {
    id: string;
    actionUrl: string | null;
    isRead: boolean;
  }) => {
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync({ notificationId: notification.id });
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">Stay updated with your courses and activities</p>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilter("all");
                  setPage(0);
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilter("unread");
                  setPage(0);
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  filter === "unread"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Unread
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter || ""}
              onChange={(e) => {
                setTypeFilter(e.target.value || undefined);
                setPage(0);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              <option value="announcement">Announcements</option>
              <option value="discussion_reply">Discussion Replies</option>
              <option value="assignment_graded">Assignment Graded</option>
              <option value="quiz_graded">Quiz Graded</option>
              <option value="course_enrollment">Course Enrollments</option>
              <option value="certificate_issued">Certificates</option>
              <option value="coupon_created">Coupons</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Mark all read
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to delete all read notifications? This cannot be undone."
                    )
                  ) {
                    deleteAllReadMutation.mutate();
                  }
                }}
                disabled={deleteAllReadMutation.isPending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete all read
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {data?.items.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <div className="text-6xl">🔔</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No notifications</h3>
              <p className="mt-2 text-gray-600">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            data?.items.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border bg-white p-4 transition-all hover:shadow-md ${
                  !notification.isRead ? "border-blue-300 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl">{getNotificationIcon(notification.type)}</div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 cursor-pointer"
                      >
                        <h3
                          className={`text-lg ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-gray-700">{notification.message}</p>
                        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.course && !Array.isArray(notification.course) && (
                            <>
                              <span>•</span>
                              <span>{notification.course.title}</span>
                            </>
                          )}
                          {notification.priority === "high" && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-red-600">High Priority</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread Badge */}
                      {!notification.isRead && (
                        <span className="ml-2 mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-blue-600"></span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      {notification.actionUrl && (
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      )}
                      {!notification.isRead ? (
                        <button
                          onClick={() =>
                            markAsReadMutation.mutate({ notificationId: notification.id })
                          }
                          disabled={markAsReadMutation.isPending}
                          className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          Mark as read
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            markAsUnreadMutation.mutate({ notificationId: notification.id })
                          }
                          disabled={markAsUnreadMutation.isPending}
                          className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          Mark as unread
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this notification?")) {
                            deleteNotificationMutation.mutate({
                              notificationId: notification.id,
                            });
                          }
                        }}
                        disabled={deleteNotificationMutation.isPending}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.total > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.total)} of{" "}
              {data.total} notifications
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.hasMore}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

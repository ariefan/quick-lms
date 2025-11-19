"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

interface CourseListProps {
  institutionId?: string;
}

export function CourseList({ institutionId }: CourseListProps) {
  const [statusFilter, setStatusFilter] = useState<
    "draft" | "published" | "archived" | "under_review" | "all"
  >("all");

  const { data: myCourses, isLoading, refetch } = trpc.course.getMyCourses.useQuery();

  const filteredCourses =
    statusFilter === "all"
      ? myCourses
      : myCourses?.filter((course) => course.status === statusFilter);

  const institutionFilteredCourses = institutionId
    ? filteredCourses?.filter((course) => course.institutionId === institutionId)
    : filteredCourses;

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      archived: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"}`}
      >
        {status === "under_review"
          ? "Under Review"
          : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLevelBadge = (level: string) => {
    const levelStyles = {
      beginner: "bg-green-50 text-green-700 border-green-200",
      intermediate: "bg-blue-50 text-blue-700 border-blue-200",
      advanced: "bg-purple-50 text-purple-700 border-purple-200",
      expert: "bg-red-50 text-red-700 border-red-200",
    };

    return (
      <span
        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${levelStyles[level as keyof typeof levelStyles]}`}
      >
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading courses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your courses, create lessons, and track student progress
          </p>
        </div>

        <Link
          href={institutionId ? `/institutions/${institutionId}/courses/new` : "/courses/new"}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          + Create Course
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(["all", "draft", "published", "under_review", "archived"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status === "under_review"
              ? "Under Review"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {institutionFilteredCourses?.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No courses yet</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by creating your first course.</p>
            <Link
              href={institutionId ? `/institutions/${institutionId}/courses/new` : "/courses/new"}
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create Course
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {institutionFilteredCourses?.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}/edit`}
                className="group rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Course Thumbnail Placeholder */}
                <div className="mb-4 flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="text-4xl text-white opacity-80">📚</div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Title & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                        {course.title}
                      </h3>
                      {getStatusBadge(course.status)}
                    </div>
                    {course.shortDescription && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {course.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {getLevelBadge(course.level)}
                    <span>•</span>
                    <span>
                      {course.price === "0.00" || course.price === "0"
                        ? "Free"
                        : `$${course.price}`}
                    </span>
                  </div>

                  {/* Institution */}
                  <div className="text-xs text-gray-500">{(course.institution as any).name}</div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 border-t pt-3 text-xs text-gray-500">
                    <span>{course.totalLessons} lessons</span>
                    <span>•</span>
                    <span>
                      {course.updatedAt
                        ? `Updated ${new Date(course.updatedAt).toLocaleDateString()}`
                        : "Just created"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

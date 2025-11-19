"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

export function MyLearning() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  const { data: enrollments, isLoading } = trpc.student.getMyEnrollments.useQuery();

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading your courses...</div>;
  }

  const filteredEnrollments =
    statusFilter === "all" ? enrollments : enrollments?.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Learning</h1>
          <p className="mt-1 text-sm text-gray-600">
            Continue your learning journey and track your progress
          </p>
        </div>
        <Link
          href="/catalog"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Browse Catalog
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(["all", "active", "completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-2xl font-bold text-blue-600">{enrollments?.length || 0}</div>
          <div className="mt-1 text-sm text-gray-600">Total Courses</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-2xl font-bold text-green-600">
            {enrollments?.filter((e) => e.status === "active").length || 0}
          </div>
          <div className="mt-1 text-sm text-gray-600">In Progress</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-2xl font-bold text-purple-600">
            {enrollments?.filter((e) => e.status === "completed").length || 0}
          </div>
          <div className="mt-1 text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Enrolled Courses */}
      {filteredEnrollments?.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No courses yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {statusFilter === "all"
              ? "Browse our catalog to find courses that interest you."
              : `You don't have any ${statusFilter} courses.`}
          </p>
          <Link
            href="/catalog"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnrollments?.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/learn/${enrollment.course.id}`}
              className="group rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Course Thumbnail */}
              <div className="flex h-32 items-center justify-center rounded-t-lg bg-gradient-to-br from-blue-500 to-purple-600">
                {enrollment.course.thumbnail ? (
                  <img
                    src={enrollment.course.thumbnail}
                    alt={enrollment.course.title}
                    className="h-full w-full rounded-t-lg object-cover"
                  />
                ) : (
                  <div className="text-4xl text-white opacity-80">📚</div>
                )}
              </div>

              <div className="p-6 space-y-3">
                {/* Title & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                      {enrollment.course.title}
                    </h3>
                    {enrollment.status === "completed" && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Completed
                      </span>
                    )}
                  </div>
                  {enrollment.course.shortDescription && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {enrollment.course.shortDescription}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>{enrollment.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{enrollment.completedLessons} lessons completed</span>
                  {enrollment.lastAccessedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Last accessed {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>

                {/* Institution */}
                <div className="text-xs text-gray-500">{enrollment.course.institution.name}</div>

                {/* CTA */}
                <div className="border-t pt-3">
                  <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    {enrollment.status === "completed" ? "Review Course" : "Continue Learning"} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

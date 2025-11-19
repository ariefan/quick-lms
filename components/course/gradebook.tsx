"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface GradebookProps {
  courseId: string;
}

export function Gradebook({ courseId }: GradebookProps) {
  const { data: course, isLoading: courseLoading } = trpc.course.getById.useQuery({
    id: courseId,
  });

  const { data: quizzes } = trpc.quiz.getCourseQuizzes.useQuery({ courseId });
  const { data: assignments } = trpc.assignment.getCourseAssignments.useQuery({ courseId });

  if (courseLoading) {
    return <div className="text-center text-gray-500">Loading gradebook...</div>;
  }

  if (!course) {
    return <div className="text-center text-gray-500">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gradebook</h1>
            <p className="mt-2 text-gray-600">{course.title}</p>
          </div>
          <Link
            href={`/courses/${courseId}/edit`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Course
          </Link>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Quizzes</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Assignments</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Overall</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Gradebook feature coming soon. This will display all student grades for quizzes
                  and assignments.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Quizzes</h3>
          <p className="mt-2 text-3xl font-bold">{quizzes?.length || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Assignments</h3>
          <p className="mt-2 text-3xl font-bold">{assignments?.length || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Enrolled Students</h3>
          <p className="mt-2 text-3xl font-bold">-</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="rounded-lg border bg-gray-50 p-6">
        <h3 className="text-lg font-semibold">Export Options</h3>
        <p className="mt-2 text-sm text-gray-600">
          Export functionality will be available in a future update. You'll be able to export
          grades to CSV, PDF, or Excel formats.
        </p>
      </div>
    </div>
  );
}

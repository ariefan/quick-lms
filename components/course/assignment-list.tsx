"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface AssignmentListProps {
  courseId: string;
}

export function AssignmentList({ courseId }: AssignmentListProps) {
  const {
    data: assignments,
    isLoading,
    refetch,
  } = trpc.assignment.getCourseAssignments.useQuery({
    courseId,
  });
  const deleteMutation = trpc.assignment.delete.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <div className="text-gray-500">Loading assignments...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assignments</h3>
        <Link
          href={`/courses/${courseId}/assignments/new`}
          className="rounded-md bg-green-600 px-3 py-1 text-sm font-semibold text-white hover:bg-green-500"
        >
          + Add Assignment
        </Link>
      </div>

      {assignments && assignments.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-gray-500">
          No assignments yet. Create your first assignment.
        </div>
      ) : (
        <div className="space-y-2">
          {assignments?.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-md border bg-white p-4"
            >
              <div className="flex-1">
                <h4 className="font-medium">{assignment.title}</h4>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>Max score: {assignment.maxScore}</span>
                  {assignment.dueDate && (
                    <>
                      <span>•</span>
                      <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </>
                  )}
                  {assignment.allowLateSubmission && (
                    <>
                      <span>•</span>
                      <span>Late: -{assignment.lateSubmissionPenalty}%</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/courses/${courseId}/assignments/${assignment.id}/submissions`}
                  className="rounded-md bg-gray-600 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-500"
                >
                  Grade
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this assignment?"))
                      deleteMutation.mutate({ id: assignment.id });
                  }}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

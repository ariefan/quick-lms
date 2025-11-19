"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface StudentGradesProps {
  courseId: string;
}

export function StudentGrades({ courseId }: StudentGradesProps) {
  const { data: course, isLoading: courseLoading } = trpc.course.getById.useQuery({
    id: courseId,
  });

  const { data: quizzes } = trpc.quiz.getCourseQuizzes.useQuery({ courseId });
  const { data: assignments } = trpc.assignment.getCourseAssignments.useQuery({ courseId });

  if (courseLoading) {
    return <div className="text-center text-gray-500">Loading grades...</div>;
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
            <h1 className="text-3xl font-bold">My Grades</h1>
            <p className="mt-2 text-gray-600">{course.title}</p>
          </div>
          <Link
            href={`/learn/${courseId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Course
          </Link>
        </div>
      </div>

      {/* Quiz Grades */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Quiz Grades</h2>

        {!quizzes || quizzes.length === 0 ? (
          <p className="mt-4 text-gray-500">No quizzes available</p>
        ) : (
          <div className="mt-4 space-y-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-md border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{quiz.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Passing Score: {quiz.passingScore}% | Max Attempts: {quiz.maxAttempts}
                    </p>
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/learn/${courseId}/quizzes/${quiz.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Take Quiz →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Grades */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Assignment Grades</h2>

        {!assignments || assignments.length === 0 ? (
          <p className="mt-4 text-gray-500">No assignments available</p>
        ) : (
          <div className="mt-4 space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{assignment.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Max Score: {assignment.maxScore}
                      {assignment.dueDate && (
                        <>
                          {" "}
                          | Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/learn/${courseId}/assignments/${assignment.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Submit →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall Statistics */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Overall Statistics</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Quizzes Completed</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">0 / {quizzes?.length || 0}</p>
          </div>
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">Assignments Submitted</p>
            <p className="mt-2 text-2xl font-bold text-green-600">0 / {assignments?.length || 0}</p>
          </div>
          <div className="rounded-md bg-purple-50 p-4">
            <p className="text-sm font-medium text-purple-900">Overall Grade</p>
            <p className="mt-2 text-2xl font-bold text-purple-600">-</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Detailed grade calculations will be available once you complete assessments.
        </p>
      </div>
    </div>
  );
}

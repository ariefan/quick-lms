"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface QuizListProps {
  courseId: string;
}

export function QuizList({ courseId }: QuizListProps) {
  const { data: quizzes, isLoading, refetch } = trpc.quiz.getCourseQuizzes.useQuery({ courseId });
  const deleteMutation = trpc.quiz.delete.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <div className="text-gray-500">Loading quizzes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quizzes</h3>
        <Link
          href={`/courses/${courseId}/quizzes/new`}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Quiz
        </Link>
      </div>

      {quizzes && quizzes.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-6 text-center text-gray-500">
          No quizzes yet. Create your first quiz to assess students.
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes?.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center justify-between rounded-md border bg-white p-4"
            >
              <div className="flex-1">
                <h4 className="font-medium">{quiz.title}</h4>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>{quiz.questionCount} questions</span>
                  <span>•</span>
                  <span>Pass: {quiz.passingScore}%</span>
                  <span>•</span>
                  <span>Max attempts: {quiz.maxAttempts}</span>
                  {quiz.timeLimit && (
                    <>
                      <span>•</span>
                      <span>{quiz.timeLimit} min</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/courses/${courseId}/quizzes/${quiz.id}/edit`}
                  className="rounded-md bg-gray-600 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-500"
                >
                  Edit
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this quiz?")) deleteMutation.mutate({ id: quiz.id });
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

"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface QuizEditorProps {
  courseId: string;
  quizId: string;
}

export function QuizEditor({ courseId, quizId }: QuizEditorProps) {
  const router = useRouter();
  const { data: quiz, isLoading } = trpc.quiz.getById.useQuery({ id: quizId });

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-center text-gray-500">Quiz not found</div>;
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{quiz.title}</h2>
      <p className="mt-2 text-gray-600">{quiz.description}</p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Passing Score:</span> {quiz.passingScore}%
          </div>
          <div>
            <span className="font-medium">Max Attempts:</span> {quiz.maxAttempts}
          </div>
          <div>
            <span className="font-medium">Time Limit:</span>{" "}
            {quiz.timeLimit ? `${quiz.timeLimit} minutes` : "No limit"}
          </div>
          <div>
            <span className="font-medium">Questions:</span> {quiz.questions?.length || 0}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">Questions</h3>
          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="mt-4 space-y-4">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="rounded-md border bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Q{index + 1}.</span>
                        <span className="text-sm text-gray-600">{question.points} points</span>
                      </div>
                      <p className="mt-2">{question.question}</p>

                      {question.options && question.options.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {question.options.map((option: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <span
                                className={
                                  option.isCorrect ? "font-medium text-green-600" : "text-gray-600"
                                }
                              >
                                {String.fromCharCode(65 + idx)}. {option.text}
                                {option.isCorrect && " ✓"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-500">No questions yet.</p>
          )}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Course
          </button>
        </div>
      </div>
    </div>
  );
}

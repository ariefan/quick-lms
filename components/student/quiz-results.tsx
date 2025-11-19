"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface QuizResultsProps {
  courseId: string;
  quizId: string;
  attemptId: string;
}

export function QuizResults({ courseId, quizId, attemptId }: QuizResultsProps) {
  const router = useRouter();
  const { data: results, isLoading } = trpc.quiz.getAttemptResults.useQuery({ attemptId });

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading results...</div>;
  }

  if (!results) {
    return <div className="text-center text-gray-500">Results not found</div>;
  }

  const percentage = (results.score / results.maxScore) * 100;
  const passed = percentage >= (results.quiz as any).passingScore;

  return (
    <div className="space-y-6">
      {/* Overall Results */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">{(results.quiz as any).title}</h1>

        <div
          className={`mt-6 rounded-lg p-6 text-center ${
            passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          <h2 className="text-4xl font-bold">
            {results.score} / {results.maxScore}
          </h2>
          <p className="mt-2 text-2xl font-semibold">{percentage.toFixed(1)}%</p>
          <p className="mt-4 text-lg font-medium">
            {passed ? "✓ Passed" : "✗ Failed"} (Passing score: {(results.quiz as any).passingScore}
            %)
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Correct Answers</p>
            <p className="text-2xl font-bold text-green-600">{results.correctAnswers}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Questions</p>
            <p className="text-2xl font-bold">{(results.quiz as any).questions.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Time Taken</p>
            <p className="text-2xl font-bold">
              {results.timeSpent ? `${Math.round(results.timeSpent / 60)} min` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Question Details */}
      {(results.quiz as any).showResults && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detailed Results</h2>

          {(results.quiz as any).questions.map((question: any, index: number) => {
            const userAnswer = results.answers.find((a: any) => a.questionId === question.id);

            // Determine if answer is correct based on question type
            let isCorrect = false;
            if (
              question.questionType === "single_choice" ||
              question.questionType === "true_false"
            ) {
              isCorrect =
                userAnswer?.selectedOptions &&
                userAnswer.selectedOptions.length === 1 &&
                question.options?.some(
                  (opt: any) => opt.isCorrect && userAnswer.selectedOptions?.includes(opt.text)
                );
            } else if (question.questionType === "multiple_choice") {
              const correctOptions =
                question.options?.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text) ||
                [];
              const userOptions = userAnswer?.selectedOptions || [];
              isCorrect =
                correctOptions.length === userOptions.length &&
                correctOptions.every((opt: string) => userOptions.includes(opt));
            } else if (question.questionType === "short_answer") {
              isCorrect =
                question.correctAnswers?.some(
                  (correct: string) =>
                    correct.toLowerCase().trim() === userAnswer?.textAnswer?.toLowerCase().trim()
                ) || false;
            }
            // Essay questions are not auto-graded

            const pointsEarned = isCorrect ? question.points : 0;

            return (
              <div
                key={question.id}
                className={`rounded-lg border p-6 ${
                  isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`rounded-full px-2 py-1 text-sm font-semibold ${
                      isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {isCorrect ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <p className="text-lg font-medium">
                      Q{index + 1}. {question.question}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {pointsEarned} / {question.points} points
                    </p>

                    {/* Display options for choice-based questions */}
                    {(question.questionType === "single_choice" ||
                      question.questionType === "multiple_choice" ||
                      question.questionType === "true_false") && (
                      <div className="mt-4 space-y-2">
                        {question.options?.map((option: any, idx: number) => {
                          const wasSelected =
                            userAnswer?.selectedOptions?.includes(option.text) || false;
                          const isCorrectOption = option.isCorrect;

                          return (
                            <div
                              key={idx}
                              className={`rounded-md border p-3 ${
                                isCorrectOption
                                  ? "border-green-500 bg-green-100"
                                  : wasSelected
                                    ? "border-red-500 bg-red-100"
                                    : "border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {wasSelected && (
                                  <span className="font-semibold text-blue-600">Your answer:</span>
                                )}
                                {isCorrectOption && (results.quiz as any).showCorrectAnswers && (
                                  <span className="font-semibold text-green-600">Correct:</span>
                                )}
                                <span>
                                  {String.fromCharCode(65 + idx)}. {option.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Display text answers */}
                    {(question.questionType === "short_answer" ||
                      question.questionType === "essay") && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                        <div className="mt-1 rounded-md border border-gray-300 bg-white p-3">
                          {userAnswer?.textAnswer || (
                            <span className="italic text-gray-400">No answer provided</span>
                          )}
                        </div>

                        {(results.quiz as any).showCorrectAnswers &&
                          question.questionType === "short_answer" &&
                          question.correctAnswers &&
                          question.correctAnswers.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-green-700">
                                Acceptable Answers:
                              </p>
                              <div className="mt-1 text-sm text-gray-600">
                                {question.correctAnswers.join(", ")}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Explanation */}
                    {question.explanation && (results.quiz as any).showCorrectAnswers && (
                      <div className="mt-4 rounded-md bg-blue-50 p-3">
                        <p className="text-sm font-medium text-blue-900">Explanation:</p>
                        <p className="mt-1 text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href={`/learn/${courseId}`}
          className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-500"
        >
          Back to Course
        </Link>
        {results.attemptNumber < (results.quiz as any).maxAttempts && (
          <Link
            href={`/learn/${courseId}/quizzes/${quizId}`}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry Quiz ({(results.quiz as any).maxAttempts - results.attemptNumber} attempts
            remaining)
          </Link>
        )}
      </div>
    </div>
  );
}

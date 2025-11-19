"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface QuizPlayerProps {
  courseId: string;
  quizId: string;
}

interface QuizAnswer {
  questionId: string;
  selectedOptions: string[];
  textAnswer?: string;
}

export function QuizPlayer({ courseId, quizId }: QuizPlayerProps) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Map<string, QuizAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: quiz, isLoading } = trpc.quiz.getById.useQuery({ id: quizId });
  const { data: myAttempts } = trpc.quiz.getMyAttempts.useQuery({ quizId });
  const startAttemptMutation = trpc.quiz.startAttempt.useMutation();
  const submitAttemptMutation = trpc.quiz.submitAttempt.useMutation();

  // Timer effect
  useEffect(() => {
    if (attemptId && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            // Auto-submit when time runs out
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [attemptId, timeRemaining]);

  const handleStartAttempt = async () => {
    try {
      const attempt = await startAttemptMutation.mutateAsync({ quizId });
      setAttemptId(attempt.id);
      setStartTime(Date.now());

      // Set timer if quiz has time limit
      if (quiz?.timeLimit) {
        setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error("Failed to start attempt:", error);
      alert("Failed to start quiz. Please try again.");
    }
  };

  const handleAnswerChange = (
    questionId: string,
    selectedOptions: string[],
    textAnswer?: string
  ) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, { questionId, selectedOptions, textAnswer });
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const confirmed = confirm("Are you sure you want to submit your quiz?");
    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      // Calculate time spent in seconds
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const answersArray = Array.from(answers.values());
      await submitAttemptMutation.mutateAsync({
        attemptId: attemptId!,
        answers: answersArray,
        timeSpent,
      });

      // Redirect to results page
      router.push(`/learn/${courseId}/quizzes/${quizId}/results/${attemptId}`);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      alert("Failed to submit quiz. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-center text-gray-500">Quiz not found</div>;
  }

  // Check if user has reached max attempts
  const attemptsUsed = myAttempts?.length || 0;
  const canTakeQuiz = attemptsUsed < quiz.maxAttempts;

  // If not started, show quiz info
  if (!attemptId) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          {quiz.description && <p className="mt-2 text-gray-600">{quiz.description}</p>}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Questions:</span> {quiz.questions?.length || 0}
            </div>
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
          </div>

          {quiz.instructions && (
            <div className="mt-6">
              <h3 className="font-semibold">Instructions:</h3>
              <p className="mt-2 text-gray-600">{quiz.instructions}</p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-semibold">Your Attempts:</h3>
            <p className="mt-1 text-gray-600">
              {attemptsUsed} of {quiz.maxAttempts} attempts used
            </p>
          </div>

          {canTakeQuiz ? (
            <button
              onClick={handleStartAttempt}
              disabled={startAttemptMutation.isPending}
              className="mt-6 rounded-md bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {startAttemptMutation.isPending ? "Starting..." : "Start Quiz"}
            </button>
          ) : (
            <div className="mt-6 rounded-md bg-red-50 p-4 text-red-800">
              You have used all your attempts for this quiz.
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="mt-4 rounded-md border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Quiz is in progress
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Timer */}
      {timeRemaining !== null && (
        <div className="sticky top-0 z-10 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{quiz.title}</h2>
            <div
              className={`text-lg font-semibold ${timeRemaining < 60 ? "text-red-600" : "text-gray-700"}`}
            >
              Time Remaining: {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions?.map((question, index) => (
          <QuestionDisplay
            key={question.id}
            question={question}
            index={index}
            answer={answers.get(question.id)}
            onAnswerChange={handleAnswerChange}
          />
        ))}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
          <div className="text-sm text-gray-600">
            <p>
              Answered: {answers.size} of {quiz.questions?.length || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Display Component
function QuestionDisplay({
  question,
  index,
  answer,
  onAnswerChange,
}: {
  question: any;
  index: number;
  answer?: QuizAnswer;
  onAnswerChange: (questionId: string, selectedOptions: string[], textAnswer?: string) => void;
}) {
  const handleOptionSelect = (optionText: string) => {
    if (question.questionType === "single_choice" || question.questionType === "true_false") {
      // Single selection
      onAnswerChange(question.id, [optionText], undefined);
    } else if (question.questionType === "multiple_choice") {
      // Multiple selection
      const currentSelected = answer?.selectedOptions || [];
      const newSelected = currentSelected.includes(optionText)
        ? currentSelected.filter((opt) => opt !== optionText)
        : [...currentSelected, optionText];
      onAnswerChange(question.id, newSelected, undefined);
    }
  };

  const handleTextChange = (text: string) => {
    onAnswerChange(question.id, [], text);
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-lg font-semibold">Q{index + 1}.</span>
        <div className="flex-1">
          <p className="text-lg">{question.question}</p>
          <p className="mt-1 text-sm text-gray-500">{question.points} points</p>

          <div className="mt-4">
            {(question.questionType === "single_choice" ||
              question.questionType === "multiple_choice" ||
              question.questionType === "true_false") && (
              <div className="space-y-2">
                {question.options?.map((option: any, idx: number) => {
                  const isSelected = answer?.selectedOptions.includes(option.text);
                  const isSingleChoice =
                    question.questionType === "single_choice" ||
                    question.questionType === "true_false";

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleOptionSelect(option.text)}
                      className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded ${
                          isSingleChoice ? "rounded-full" : "rounded"
                        } border ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-gray-400 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="white"
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1">
                        {String.fromCharCode(65 + idx)}. {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {question.questionType === "short_answer" && (
              <input
                type="text"
                value={answer?.textAnswer || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Enter your answer"
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            )}

            {question.questionType === "essay" && (
              <textarea
                value={answer?.textAnswer || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={6}
                placeholder="Enter your essay answer"
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface QuizBuilderProps {
  courseId: string;
  quizId?: string;
}

interface QuizQuestion {
  tempId: string;
  questionText: string;
  questionType: "single_choice" | "multiple_choice" | "true_false" | "short_answer" | "essay";
  options: string[];
  correctAnswers: string[];
  points: number;
  explanation?: string;
}

export function QuizBuilder({ courseId, quizId }: QuizBuilderProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);

  // Questions
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const createQuizMutation = trpc.quiz.create.useMutation();

  const handleAddQuestion = (question: QuizQuestion) => {
    setQuestions([...questions, question]);
    setShowQuestionForm(false);
  };

  const handleRemoveQuestion = (tempId: string) => {
    setQuestions(questions.filter((q) => q.tempId !== tempId));
  };

  const handleUpdateQuestion = (tempId: string, updatedQuestion: QuizQuestion) => {
    setQuestions(questions.map((q) => (q.tempId === tempId ? updatedQuestion : q)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.length === 0) {
      alert("Please add at least one question to the quiz");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create quiz
      const quiz = await createQuizMutation.mutateAsync({
        title,
        description: description || undefined,
        courseId,
        passingScore,
        maxAttempts,
        timeLimit: timeLimit || undefined,
        shuffleQuestions,
        shuffleOptions,
        showResults,
        showCorrectAnswers,
      });

      // Create questions using tRPC client
      const createQuestion = trpc.quiz.createQuestion.useMutation();
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        // Build options array with proper structure
        const options = question.options.map((opt, idx) => ({
          id: `${question.tempId}-opt-${idx}`,
          text: opt,
          isCorrect: question.correctAnswers.includes(opt),
        }));

        await createQuestion.mutateAsync({
          quizId: quiz.id,
          question: question.questionText,
          questionType: question.questionType,
          options,
          correctAnswers: question.questionType === "short_answer" ? question.correctAnswers : [],
          points: question.points,
          explanation: question.explanation,
          displayOrder: i + 1,
        });
      }

      router.push(`/courses/${courseId}/edit`);
    } catch (error) {
      console.error("Failed to create quiz:", error);
      alert("Failed to create quiz. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Quiz Settings */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Quiz Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Chapter 1 Quiz"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the quiz (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Passing Score (%)</label>
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value))}
                min={0}
                max={100}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Max Attempts</label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                min={1}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Time Limit (minutes)</label>
              <input
                type="number"
                value={timeLimit || ""}
                onChange={(e) =>
                  setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)
                }
                min={1}
                placeholder="No limit"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Shuffle question order</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Shuffle option order</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showResults}
                onChange={(e) => setShowResults(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show results after submission</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCorrectAnswers}
                onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show correct answers after submission</span>
            </label>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
          <button
            type="button"
            onClick={() => setShowQuestionForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            + Add Question
          </button>
        </div>

        {questions.length === 0 && !showQuestionForm && (
          <div className="rounded-md bg-gray-50 p-8 text-center text-gray-500">
            No questions yet. Add your first question to get started.
          </div>
        )}

        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.tempId}
              question={question}
              index={index}
              onRemove={() => handleRemoveQuestion(question.tempId)}
              onUpdate={(updated) => handleUpdateQuestion(question.tempId, updated)}
            />
          ))}

          {showQuestionForm && (
            <QuestionForm onSave={handleAddQuestion} onCancel={() => setShowQuestionForm(false)} />
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || questions.length === 0}
          className="rounded-md bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {isSubmitting ? "Creating Quiz..." : "Create Quiz"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  onRemove,
  onUpdate,
}: {
  question: QuizQuestion;
  index: number;
  onRemove: () => void;
  onUpdate: (updated: QuizQuestion) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const questionTypeLabels = {
    single_choice: "Single Choice",
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    short_answer: "Short Answer",
    essay: "Essay",
  };

  if (isEditing) {
    return (
      <QuestionForm
        initialQuestion={question}
        onSave={(updated) => {
          onUpdate(updated);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-md border bg-gray-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Q{index + 1}.</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {questionTypeLabels[question.questionType]}
            </span>
            <span className="text-sm text-gray-600">{question.points} points</span>
          </div>
          <p className="mt-2">{question.questionText}</p>

          {(question.questionType === "single_choice" ||
            question.questionType === "multiple_choice" ||
            question.questionType === "true_false") && (
            <ul className="mt-2 space-y-1">
              {question.options.map((option, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      question.correctAnswers.includes(option)
                        ? "font-medium text-green-600"
                        : "text-gray-600"
                    }
                  >
                    {String.fromCharCode(65 + idx)}. {option}
                    {question.correctAnswers.includes(option) && " ✓"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {question.questionType === "short_answer" && (
            <p className="mt-2 text-sm text-gray-600">
              Correct answers: {question.correctAnswers.join(", ")}
            </p>
          )}

          {question.explanation && (
            <p className="mt-2 text-sm text-gray-600">Explanation: {question.explanation}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Form Component
function QuestionForm({
  initialQuestion,
  onSave,
  onCancel,
}: {
  initialQuestion?: QuizQuestion;
  onSave: (question: QuizQuestion) => void;
  onCancel: () => void;
}) {
  const [questionText, setQuestionText] = useState(initialQuestion?.questionText || "");
  const [questionType, setQuestionType] = useState<QuizQuestion["questionType"]>(
    initialQuestion?.questionType || "single_choice"
  );
  const [options, setOptions] = useState<string[]>(initialQuestion?.options || ["", "", "", ""]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    initialQuestion?.correctAnswers || []
  );
  const [points, setPoints] = useState(initialQuestion?.points || 1);
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || "");

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    // Remove from correct answers if it was selected
    const removedOption = options[index];
    setCorrectAnswers(correctAnswers.filter((ans) => ans !== removedOption));
  };

  const handleOptionChange = (index: number, value: string) => {
    const oldValue = options[index];
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);

    // Update correct answers if this option was selected
    if (correctAnswers.includes(oldValue)) {
      setCorrectAnswers(correctAnswers.map((ans) => (ans === oldValue ? value : ans)));
    }
  };

  const handleToggleCorrect = (option: string) => {
    if (questionType === "single_choice" || questionType === "true_false") {
      setCorrectAnswers([option]);
    } else if (questionType === "multiple_choice") {
      if (correctAnswers.includes(option)) {
        setCorrectAnswers(correctAnswers.filter((ans) => ans !== option));
      } else {
        setCorrectAnswers([...correctAnswers, option]);
      }
    }
  };

  const handleSave = () => {
    if (!questionText.trim()) {
      alert("Please enter a question");
      return;
    }

    if (questionType !== "essay" && questionType !== "short_answer") {
      const validOptions = options.filter((opt) => opt.trim() !== "");
      if (validOptions.length < 2) {
        alert("Please add at least 2 options");
        return;
      }
    }

    if (correctAnswers.length === 0 && questionType !== "essay") {
      alert("Please select at least one correct answer");
      return;
    }

    const question: QuizQuestion = {
      tempId: initialQuestion?.tempId || `temp-${Date.now()}`,
      questionText,
      questionType,
      options:
        questionType === "essay" || questionType === "short_answer"
          ? []
          : options.filter((opt) => opt.trim() !== ""),
      correctAnswers,
      points,
      explanation: explanation || undefined,
    };

    onSave(question);
  };

  // Set default options for true/false
  const handleTypeChange = (type: QuizQuestion["questionType"]) => {
    setQuestionType(type);
    setCorrectAnswers([]);

    if (type === "true_false") {
      setOptions(["True", "False"]);
    } else if (type === "essay" || type === "short_answer") {
      setOptions([]);
    } else if (options.length === 0) {
      setOptions(["", "", "", ""]);
    }
  };

  return (
    <div className="rounded-md border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">
        {initialQuestion ? "Edit Question" : "New Question"}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Question Type</label>
          <select
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuizQuestion["questionType"])}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Question Text</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            placeholder="Enter your question here"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {(questionType === "single_choice" ||
          questionType === "multiple_choice" ||
          questionType === "true_false") && (
          <div>
            <label className="block text-sm font-medium">Options (click to mark as correct)</label>
            <div className="mt-1 space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCorrect(option)}
                    className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-semibold ${
                      correctAnswers.includes(option)
                        ? "border-green-600 bg-green-100 text-green-700"
                        : "border-gray-300 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </button>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    disabled={questionType === "true_false"}
                    className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                  {questionType !== "true_false" && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {questionType !== "true_false" && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  + Add Option
                </button>
              )}
            </div>
          </div>
        )}

        {questionType === "short_answer" && (
          <div>
            <label className="block text-sm font-medium">Correct Answers (one per line)</label>
            <textarea
              value={correctAnswers.join("\n")}
              onChange={(e) =>
                setCorrectAnswers(e.target.value.split("\n").filter((ans) => ans.trim() !== ""))
              }
              rows={3}
              placeholder="Enter acceptable answers, one per line"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Matching is case-insensitive</p>
          </div>
        )}

        {questionType === "essay" && (
          <p className="text-sm text-gray-600">Essay questions require manual grading.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Points</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              min={1}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Explanation (optional)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            placeholder="Provide an explanation for the correct answer"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {initialQuestion ? "Update Question" : "Add Question"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

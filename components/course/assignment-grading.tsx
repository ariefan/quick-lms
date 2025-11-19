"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface AssignmentGradingProps {
  courseId: string;
  assignmentId: string;
}

export function AssignmentGrading({ courseId, assignmentId }: AssignmentGradingProps) {
  const { data: assignment, isLoading: assignmentLoading } = trpc.assignment.getById.useQuery({
    id: assignmentId,
  });
  const {
    data: submissions,
    isLoading: submissionsLoading,
    refetch,
  } = trpc.assignment.getAssignmentSubmissions.useQuery({ assignmentId });

  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  if (assignmentLoading || submissionsLoading) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  if (!assignment) {
    return <div className="text-center text-gray-500">Assignment not found</div>;
  }

  const selectedSub = submissions?.find((s) => s.id === selectedSubmission);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <p className="mt-2 text-gray-600">
              Submissions: {submissions?.length || 0} | Graded:{" "}
              {submissions?.filter((s) => s.grade !== null).length || 0}
            </p>
          </div>
          <Link
            href={`/courses/${courseId}/edit`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Course
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Submissions List */}
        <div className="space-y-2 lg:col-span-1">
          <h2 className="text-lg font-semibold">Submissions</h2>

          {!submissions || submissions.length === 0 ? (
            <div className="rounded-md bg-gray-50 p-6 text-center text-gray-500">
              No submissions yet
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => setSelectedSubmission(submission.id)}
                  className={`w-full rounded-md border p-4 text-left transition-colors ${
                    selectedSubmission === submission.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium">
                    {(submission.user as any).name || (submission.user as any).email}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleString()
                      : "N/A"}
                    {submission.isLate && <span className="ml-1 text-red-600">(Late)</span>}
                  </p>
                  {submission.grade !== null ? (
                    <p className="mt-2 text-sm font-semibold text-green-600">
                      Graded: {submission.grade}/{assignment.maxScore}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-orange-600">Not graded</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submission Detail & Grading */}
        <div className="lg:col-span-2">
          {selectedSub ? (
            <SubmissionGrader
              submission={selectedSub}
              assignment={assignment}
              onGraded={() => {
                refetch();
                setSelectedSubmission(null);
              }}
            />
          ) : (
            <div className="rounded-md bg-gray-50 p-12 text-center text-gray-500">
              Select a submission to view and grade
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Submission Grader Component
function SubmissionGrader({
  submission,
  assignment,
  onGraded,
}: {
  submission: any;
  assignment: any;
  onGraded: () => void;
}) {
  const [grade, setGrade] = useState(submission.grade?.toString() || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  const gradeMutation = trpc.assignment.gradeSubmission.useMutation();

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    const numGrade = parseInt(grade);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > assignment.maxScore) {
      alert(`Please enter a valid grade between 0 and ${assignment.maxScore}`);
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        submissionId: submission.id,
        score: numGrade,
        feedback: feedback || undefined,
      });

      alert("Submission graded successfully!");
      onGraded();
    } catch (error) {
      console.error("Grading error:", error);
      alert("Failed to grade submission. Please try again.");
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{submission.user.name || submission.user.email}</h2>
        <p className="mt-1 text-sm text-gray-600">
          Submitted on{" "}
          {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}
          {submission.isLate && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              Late ({assignment.lateSubmissionPenalty}% penalty)
            </span>
          )}
        </p>
      </div>

      {/* Submission Content */}
      <div className="space-y-4">
        {submission.content && (
          <div>
            <h3 className="text-sm font-semibold">Submission Content:</h3>
            <div className="mt-2 rounded-md bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-gray-700">{submission.content}</p>
            </div>
          </div>
        )}

        {submission.attachments && submission.attachments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Attachments:</h3>
            {submission.attachments.map((attachment: any, idx: number) => (
              <a
                key={idx}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-blue-600 hover:underline"
              >
                {attachment.name} →
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Grading Form */}
      <form onSubmit={handleGrade} className="mt-6 space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold">Grading</h3>

        <div>
          <label className="block text-sm font-medium">Score (out of {assignment.maxScore})</label>
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            min={0}
            max={assignment.maxScore}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Provide feedback to the student (optional)"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={gradeMutation.isPending}
          className="rounded-md bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {gradeMutation.isPending ? "Saving..." : "Save Grade"}
        </button>
      </form>
    </div>
  );
}

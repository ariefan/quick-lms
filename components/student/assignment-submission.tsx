"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface AssignmentSubmissionProps {
  courseId: string;
  assignmentId: string;
}

export function AssignmentSubmission({ courseId, assignmentId }: AssignmentSubmissionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: assignment, isLoading } = trpc.assignment.getById.useQuery({ id: assignmentId });
  const { data: mySubmission, refetch } = trpc.assignment.getMySubmission.useQuery({
    assignmentId,
  });
  const submitMutation = trpc.assignment.submit.useMutation();
  const getUploadUrlMutation = trpc.upload.getUploadUrl.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned upload URL
      const { uploadUrl, key } = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        folder: "assignments",
        fileType: "any",
      });

      // Upload file to S3
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          setAttachmentUrl(key);
          setIsUploading(false);
        } else {
          alert("File upload failed. Please try again.");
          setIsUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
        alert("File upload failed. Please try again.");
        setIsUploading(false);
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    } catch (error) {
      console.error("File upload error:", error);
      alert("File upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !attachmentUrl) {
      alert("Please provide submission content or upload a file");
      return;
    }

    try {
      const attachments = attachmentUrl
        ? [
            {
              name: "Assignment File",
              url: attachmentUrl,
              size: 0,
              type: "application/octet-stream",
            },
          ]
        : undefined;

      await submitMutation.mutateAsync({
        assignmentId,
        content: content || undefined,
        attachments,
      });

      await refetch();
      alert("Assignment submitted successfully!");
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit assignment. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="text-center text-gray-500">Assignment not found</div>;
  }

  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isLate = dueDate && now > dueDate;
  const hasSubmission = !!mySubmission;
  const canResubmit = true; // Always allow resubmission for now

  return (
    <div className="space-y-6">
      {/* Assignment Info */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">{assignment.title}</h1>
        {assignment.description && <p className="mt-2 text-gray-600">{assignment.description}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Max Score:</span> {assignment.maxScore} points
          </div>
          <div>
            <span className="font-medium">Due Date:</span>{" "}
            {dueDate ? (
              <span className={isLate ? "text-red-600" : ""}>
                {dueDate.toLocaleString()}
                {isLate && " (Past Due)"}
              </span>
            ) : (
              "No due date"
            )}
          </div>
          <div>
            <span className="font-medium">Late Submissions:</span>{" "}
            {assignment.allowLateSubmission
              ? `Allowed (${assignment.lateSubmissionPenalty}% penalty)`
              : "Not allowed"}
          </div>
        </div>

        {assignment.instructions && (
          <div className="mt-6">
            <h3 className="font-semibold">Instructions:</h3>
            <p className="mt-2 whitespace-pre-wrap text-gray-600">{assignment.instructions}</p>
          </div>
        )}
      </div>

      {/* Existing Submission */}
      {hasSubmission && (
        <div className="rounded-lg border bg-blue-50 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Your Submission</h3>
              <p className="mt-1 text-sm text-gray-600">
                Submitted on{" "}
                {mySubmission.submittedAt
                  ? new Date(mySubmission.submittedAt).toLocaleString()
                  : "N/A"}
                {mySubmission.isLate && (
                  <span className="ml-2 text-red-600">(Late submission)</span>
                )}
              </p>

              {mySubmission.content && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Submission Content:</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{mySubmission.content}</p>
                </div>
              )}

              {mySubmission.attachments && mySubmission.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Attachments:</p>
                  {mySubmission.attachments.map((attachment: any, idx: number) => (
                    <a
                      key={idx}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-blue-600 hover:underline"
                    >
                      {attachment.name}
                    </a>
                  ))}
                </div>
              )}

              {mySubmission.grade !== null && (
                <div className="mt-4 rounded-md bg-white p-4">
                  <p className="text-lg font-semibold">
                    Grade: {mySubmission.grade} / {assignment.maxScore}
                  </p>
                  {mySubmission.feedback && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Feedback:</p>
                      <p className="mt-1 text-gray-700">{mySubmission.feedback}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Graded on{" "}
                    {mySubmission.gradedAt
                      ? new Date(mySubmission.gradedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {!canResubmit && (
            <p className="mt-4 text-sm text-orange-600">
              Resubmissions are not allowed for this assignment.
            </p>
          )}
        </div>
      )}

      {/* Submission Form */}
      {(!hasSubmission || canResubmit) && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            {hasSubmission ? "Resubmit Assignment" : "Submit Assignment"}
          </h2>

          {isLate && !assignment.allowLateSubmission && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              This assignment is past due and late submissions are not allowed.
            </div>
          )}

          {isLate && assignment.allowLateSubmission && (
            <div className="mb-4 rounded-md bg-orange-50 p-4 text-orange-800">
              This assignment is past due. A {assignment.lateSubmissionPenalty}% penalty will be
              applied to your score.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Submission Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Enter your submission here (optional if you're uploading a file)"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={!!(isLate && !assignment.allowLateSubmission)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Upload File (Optional)</label>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={!!(isUploading || (isLate && !assignment.allowLateSubmission))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              {isUploading && (
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                </div>
              )}
              {attachmentUrl && !isUploading && (
                <p className="mt-1 text-sm text-green-600">File uploaded successfully!</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={
                !!(
                  submitMutation.isPending ||
                  isUploading ||
                  (isLate && !assignment.allowLateSubmission)
                )
              }
              className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
            </button>
            <Link
              href={`/learn/${courseId}`}
              className="rounded-md border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back to Course
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

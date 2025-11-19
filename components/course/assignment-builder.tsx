"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface AssignmentBuilderProps {
  courseId: string;
}

export function AssignmentBuilder({ courseId }: AssignmentBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [dueDate, setDueDate] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [lateSubmissionPenalty, setLateSubmissionPenalty] = useState(10);

  const createMutation = trpc.assignment.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        courseId,
        maxScore,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        allowLateSubmission,
        lateSubmissionPenalty: allowLateSubmission ? lateSubmissionPenalty : 0,
      });

      router.push(`/courses/${courseId}/edit`);
    } catch (error) {
      console.error("Failed to create assignment:", error);
      alert("Failed to create assignment. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Assignment Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Chapter 1 Essay Assignment"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the assignment (optional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={6}
              placeholder="Detailed instructions for students on what to submit and how to complete the assignment"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Max Score</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(parseInt(e.target.value))}
                min={1}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">Submission Settings</h3>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Allow late submissions</span>
            </label>

            {allowLateSubmission && (
              <div className="ml-6">
                <label className="block text-sm font-medium">Late Penalty (%)</label>
                <input
                  type="number"
                  value={lateSubmissionPenalty}
                  onChange={(e) => setLateSubmissionPenalty(parseInt(e.target.value))}
                  min={0}
                  max={100}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Percentage deducted from score for late submissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "Create Assignment"}
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

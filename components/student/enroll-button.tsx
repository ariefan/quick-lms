"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface EnrollButtonProps {
  courseId: string;
  courseName: string;
  price: string;
  className?: string;
}

export function EnrollButton({ courseId, courseName, price, className = "" }: EnrollButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: enrollment, refetch } = trpc.student.getEnrollmentStatus.useQuery({ courseId });

  const enrollMutation = trpc.student.enroll.useMutation({
    onSuccess: () => {
      refetch();
      setShowConfirm(false);
      router.push(`/learn/${courseId}`);
    },
  });

  const unenrollMutation = trpc.student.unenroll.useMutation({
    onSuccess: () => {
      refetch();
      setShowConfirm(false);
    },
  });

  const isFree = price === "0.00" || price === "0";
  const isEnrolled = enrollment?.enrollment?.status === "active";

  const handleEnroll = () => {
    if (isFree) {
      enrollMutation.mutate({ courseId });
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmEnroll = () => {
    enrollMutation.mutate({ courseId });
  };

  const handleUnenroll = () => {
    if (confirm("Are you sure you want to unenroll from this course?")) {
      unenrollMutation.mutate({ courseId });
    }
  };

  if (isEnrolled) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/learn/${courseId}`)}
          className={`rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 ${className}`}
        >
          Continue Learning
        </button>
        <button
          onClick={handleUnenroll}
          disabled={unenrollMutation.isPending}
          className="rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {unenrollMutation.isPending ? "Unenrolling..." : "Unenroll"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleEnroll}
        disabled={enrollMutation.isPending}
        className={`rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 ${className}`}
      >
        {enrollMutation.isPending
          ? "Enrolling..."
          : isFree
            ? "Enroll for Free"
            : `Enroll Now - $${price}`}
      </button>

      {/* Confirmation Modal for Paid Courses */}
      {showConfirm && !isFree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Enrollment</h3>
            <p className="mt-2 text-sm text-gray-600">
              You are about to enroll in <strong>{courseName}</strong>.
            </p>
            <div className="mt-4 rounded-md bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">${price}</span>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                💡 Payment integration is not yet implemented. This is a demonstration of the
                enrollment flow.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirmEnroll}
                disabled={enrollMutation.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                {enrollMutation.isPending ? "Processing..." : "Confirm Enrollment"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

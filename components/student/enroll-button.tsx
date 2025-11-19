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
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    valid: boolean;
    coupon?: { code: string; description?: string | null };
    pricing?: { originalPrice: number; discountAmount: number; finalPrice: number };
  } | null>(null);

  const { data: enrollment, refetch } = trpc.student.getEnrollmentStatus.useQuery({ courseId });

  const validateCouponQuery = trpc.coupon.validateCoupon.useQuery(
    {
      code: couponCode.toUpperCase(),
      courseId,
    },
    {
      enabled: false, // Don't run automatically
    }
  );

  const enrollMutation = trpc.student.enroll.useMutation({
    onSuccess: () => {
      refetch();
      setShowConfirm(false);
      setCouponCode("");
      setAppliedCoupon(null);
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

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      return;
    }
    try {
      const result = await validateCouponQuery.refetch();
      if (result.data) {
        setAppliedCoupon(result.data);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setAppliedCoupon({ valid: false });
      alert(err.message || "Failed to validate coupon");
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

            {/* Coupon Code Input */}
            <div className="mt-4">
              <label htmlFor="coupon" className="block text-sm font-medium text-gray-700">
                Have a coupon code?
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!appliedCoupon?.valid}
                />
                {!appliedCoupon?.valid ? (
                  <button
                    onClick={handleValidateCoupon}
                    disabled={!couponCode.trim() || validateCouponQuery.isFetching}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {validateCouponQuery.isFetching ? "..." : "Apply"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              {appliedCoupon?.valid && appliedCoupon.coupon && (
                <div className="mt-2 rounded-md bg-green-50 p-2">
                  <p className="text-xs font-medium text-green-800">
                    ✓ Coupon "{appliedCoupon.coupon.code}" applied!
                  </p>
                  {appliedCoupon.coupon.description && (
                    <p className="mt-1 text-xs text-green-700">
                      {appliedCoupon.coupon.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="mt-4 rounded-md bg-blue-50 p-4">
              {appliedCoupon?.valid && appliedCoupon.pricing ? (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Original Price:</span>
                    <span className="line-through">
                      ${(appliedCoupon.pricing.originalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-${(appliedCoupon.pricing.discountAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-blue-200 pt-2">
                    <span className="text-sm font-medium text-gray-900">Final Amount:</span>
                    <span className="text-xl font-bold text-blue-600">
                      ${(appliedCoupon.pricing.finalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">${price}</span>
                </div>
              )}
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
                onClick={() => {
                  setShowConfirm(false);
                  setAppliedCoupon(null);
                  setCouponCode("");
                }}
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

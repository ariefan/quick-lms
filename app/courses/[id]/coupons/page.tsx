"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CreateCouponForm } from "@/components/coupon/create-coupon-form";
import { CouponList } from "@/components/coupon/coupon-list";

export default function CourseCouponsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { data: course, isLoading } = trpc.course.getById.useQuery({ id: courseId });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-red-600">Course not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/courses/${courseId}`)}
          className="mb-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to Course
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Course Coupons</h1>
        <p className="mt-2 text-gray-600">Manage discount coupons for {course.title}</p>
      </div>

      <div className="space-y-8">
        {/* Create Coupon Form */}
        <CreateCouponForm
          courseId={courseId}
          institutionId={course.institutionId}
          onSuccess={() => window.location.reload()}
        />

        {/* Coupons List */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Active Coupons</h2>
          <CouponList courseId={courseId} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { CreateCouponForm } from "@/components/coupon/create-coupon-form";
import { CouponList } from "@/components/coupon/coupon-list";
import { trpc } from "@/lib/trpc/client";

export default function CouponsPage() {
  const router = useRouter();

  // Get current user info from auth router
  const { data: user } = trpc.auth.getSession.useQuery();

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Assuming user has institutionId - if not, we'd need to update the schema
  // For now, we'll use a placeholder or the first institution they belong to
  const institutionId = user.id; // This should be user.institutionId when available

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button onClick={() => router.push("/dashboard")} className="mb-4 inline-block text-blue-600 hover:underline">
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Platform Coupons</h1>
        <p className="mt-2 text-gray-600">
          Manage institution-wide discount coupons that work across all courses
        </p>
      </div>

      <div className="space-y-8">
        {/* Create Coupon Form */}
        <CreateCouponForm institutionId={institutionId} onSuccess={() => window.location.reload()} />

        {/* Coupons List */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Active Coupons</h2>
          <CouponList institutionId={institutionId} />
        </div>
      </div>
    </div>
  );
}

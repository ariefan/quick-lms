"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface CouponListProps {
  courseId?: string;
  institutionId?: string;
}

export function CouponList({ courseId, institutionId }: CouponListProps) {
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  const { data: coupons, isLoading } = trpc.coupon.getCoupons.useQuery({
    courseId,
    institutionId,
  });

  const { data: stats } = trpc.coupon.getCouponStats.useQuery(
    { couponId: selectedCouponId! },
    { enabled: !!selectedCouponId }
  );

  const deleteCouponMutation = trpc.coupon.deleteCoupon.useMutation({
    onSuccess: () => {
      // Refresh the list
      window.location.reload();
    },
  });

  const handleDelete = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }
    await deleteCouponMutation.mutateAsync({ id: couponId });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-600">Loading coupons...</p>
      </div>
    );
  }

  if (!coupons || coupons.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-600">No coupons found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {coupons.map((coupon) => {
                const now = new Date();
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
                const notStarted = coupon.startsAt && new Date(coupon.startsAt) > now;
                const isMaxedOut = coupon.maxUses && coupon.currentUses >= coupon.maxUses;

                let statusBadge = "Active";
                let statusColor = "bg-green-100 text-green-800";

                if (!coupon.isActive) {
                  statusBadge = "Disabled";
                  statusColor = "bg-gray-100 text-gray-800";
                } else if (isExpired) {
                  statusBadge = "Expired";
                  statusColor = "bg-red-100 text-red-800";
                } else if (notStarted) {
                  statusBadge = "Scheduled";
                  statusColor = "bg-blue-100 text-blue-800";
                } else if (isMaxedOut) {
                  statusBadge = "Max Uses";
                  statusColor = "bg-yellow-100 text-yellow-800";
                }

                return (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-gray-900">{coupon.code}</span>
                        {coupon.description && (
                          <span className="text-xs text-gray-500">{coupon.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%`
                          : `$${(coupon.discountValue / 100).toFixed(2)}`}
                      </span>
                      {coupon.discountType === "percentage" && coupon.maxDiscount && (
                        <span className="ml-1 text-xs text-gray-500">
                          (max ${(coupon.maxDiscount / 100).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {coupon.courseId ? "Course-specific" : "Platform-wide"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-gray-900">
                          {coupon.currentUses}
                          {coupon.maxUses ? ` / ${coupon.maxUses}` : " uses"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {coupon.maxUsesPerUser} per user
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {coupon.startsAt && (
                        <div>
                          From: {new Date(coupon.startsAt).toLocaleDateString()}
                        </div>
                      )}
                      {coupon.expiresAt && (
                        <div>
                          Until: {new Date(coupon.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                      {!coupon.startsAt && !coupon.expiresAt && (
                        <span className="text-gray-500">Always valid</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColor}`}
                      >
                        {statusBadge}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <button
                        onClick={() =>
                          setSelectedCouponId(selectedCouponId === coupon.id ? null : coupon.id)
                        }
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        {selectedCouponId === coupon.id ? "Hide" : "Stats"}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id, coupon.code)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteCouponMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Panel */}
      {selectedCouponId && stats && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Coupon Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Total Uses</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalUses}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.uniqueUsers}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Total Discount Given</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${(stats.totalDiscountGiven / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Remaining Uses</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.remainingUses ?? "Unlimited"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

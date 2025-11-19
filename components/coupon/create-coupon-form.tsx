"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CreateCouponFormProps {
  courseId?: string;
  institutionId: string;
  onSuccess?: () => void;
}

export function CreateCouponForm({ courseId, institutionId, onSuccess }: CreateCouponFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createCouponMutation = trpc.coupon.createCoupon.useMutation({
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || !discountValue) {
      return;
    }

    const discountVal = parseInt(discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      return;
    }

    await createCouponMutation.mutateAsync({
      code: code.toUpperCase(),
      description: description || undefined,
      discountType,
      discountValue: discountVal,
      maxDiscount: maxDiscount ? parseInt(maxDiscount) : undefined,
      courseId,
      institutionId,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      maxUsesPerUser: parseInt(maxUsesPerUser) || 1,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Coupon</h2>
          <p className="mt-1 text-sm text-gray-600">
            {courseId ? "Create a coupon for this course" : "Create a platform-wide coupon"}
          </p>
        </div>

        {/* Coupon Code */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Coupon Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., SAVE20"
            className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={50}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            3-50 characters, will be converted to uppercase
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for internal reference..."
            className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {/* Discount Type */}
        <div>
          <label htmlFor="discountType" className="block text-sm font-medium text-gray-700">
            Discount Type <span className="text-red-500">*</span>
          </label>
          <select
            id="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
            className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>

        {/* Discount Value */}
        <div>
          <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700">
            Discount Value <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            {discountType === "fixed" && (
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                $
              </span>
            )}
            <input
              type="number"
              id="discountValue"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "e.g., 20" : "e.g., 10.00"}
              className={`w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                discountType === "fixed" ? "pl-7" : ""
              }`}
              min="1"
              max={discountType === "percentage" ? "100" : undefined}
              step={discountType === "fixed" ? "0.01" : "1"}
              required
            />
            {discountType === "percentage" && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                %
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {discountType === "percentage"
              ? "1-100 percent off"
              : "Fixed dollar amount (will be converted to cents)"}
          </p>
        </div>

        {/* Max Discount (only for percentage) */}
        {discountType === "percentage" && (
          <div>
            <label htmlFor="maxDiscount" className="block text-sm font-medium text-gray-700">
              Maximum Discount (optional)
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                $
              </span>
              <input
                type="number"
                id="maxDiscount"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="e.g., 50.00"
                className="w-full rounded-md border border-gray-300 px-4 py-2 pl-7 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                step="0.01"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">Cap the maximum discount amount in dollars</p>
          </div>
        )}

        {/* Usage Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxUses" className="block text-sm font-medium text-gray-700">
              Max Total Uses
            </label>
            <input
              type="number"
              id="maxUses"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
            <p className="mt-1 text-sm text-gray-500">Leave empty for unlimited</p>
          </div>

          <div>
            <label htmlFor="maxUsesPerUser" className="block text-sm font-medium text-gray-700">
              Max Uses Per User <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="maxUsesPerUser"
              value={maxUsesPerUser}
              onChange={(e) => setMaxUsesPerUser(e.target.value)}
              placeholder="1"
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
            <p className="mt-1 text-sm text-gray-500">How many times each user can use</p>
          </div>
        </div>

        {/* Valid Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-gray-700">
              Start Date/Time
            </label>
            <input
              type="datetime-local"
              id="startsAt"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">Leave empty for immediate</p>
          </div>

          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
              Expiration Date/Time
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">Leave empty for no expiration</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createCouponMutation.isPending || !code.trim() || !discountValue}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {createCouponMutation.isPending ? "Creating..." : "Create Coupon"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setDescription("");
              setDiscountValue("");
              setMaxDiscount("");
              setMaxUses("");
              setMaxUsesPerUser("1");
              setStartsAt("");
              setExpiresAt("");
            }}
            className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        {/* Error */}
        {createCouponMutation.error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{createCouponMutation.error.message}</p>
          </div>
        )}
      </div>
    </form>
  );
}

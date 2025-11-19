"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MembersManager } from "./members-manager";
import Link from "next/link";

interface InstitutionDashboardProps {
  institutionId: string;
}

export function InstitutionDashboard({ institutionId }: InstitutionDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings">("overview");

  const { data: institution, isLoading } = trpc.institution.getById.useQuery({
    id: institutionId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Institution not found</div>
      </div>
    );
  }

  const getStatusBadge = () => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[institution.status as keyof typeof statusStyles]}`}
      >
        {institution.status.charAt(0).toUpperCase() + institution.status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{institution.name}</h1>
              {getStatusBadge()}
            </div>
            {institution.description && (
              <p className="mt-2 text-gray-600">{institution.description}</p>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {institution.status === "pending" && (
          <div className="mt-4 rounded-md bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              Your institution is pending approval. You'll be notified once an admin reviews your
              submission.
            </p>
          </div>
        )}

        {institution.status === "rejected" && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Institution Rejected</p>
            {institution.rejectionReason && (
              <p className="mt-1 text-sm text-red-700">Reason: {institution.rejectionReason}</p>
            )}
          </div>
        )}

        {institution.status === "suspended" && (
          <div className="mt-4 rounded-md bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-800">Institution Suspended</p>
            {institution.rejectionReason && (
              <p className="mt-1 text-sm text-gray-700">Reason: {institution.rejectionReason}</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(["overview", "members", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Institution Details</h2>
              <div className="mt-4 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <p className="mt-1 text-sm text-gray-900">{institution.slug}</p>
                </div>

                {institution.website && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <a
                      href={institution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {institution.website}
                    </a>
                  </div>
                )}

                {institution.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{institution.email}</p>
                  </div>
                )}

                {institution.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{institution.phone}</p>
                  </div>
                )}

                {institution.address && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{institution.address}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(institution.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(institution.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 border-t pt-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="text-2xl font-bold text-blue-900">{institution.maxCourses}</div>
                <div className="text-sm text-blue-700">Max Courses</div>
              </div>
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-2xl font-bold text-green-900">
                  {institution.maxInstructors}
                </div>
                <div className="text-sm text-green-700">Max Instructors</div>
              </div>
              <div className="rounded-md bg-purple-50 p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {institution.isActive ? "Active" : "Inactive"}
                </div>
                <div className="text-sm text-purple-700">Status</div>
              </div>
            </div>

            {/* Actions */}
            {institution.status === "approved" && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <div className="mt-4 flex gap-4">
                  <Link
                    href={`/institutions/${institution.id}/courses/new`}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Create Course
                  </Link>
                  <button
                    onClick={() => setActiveTab("members")}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Manage Members
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && <MembersManager institutionId={institution.id} />}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your institution settings and preferences
              </p>
            </div>

            <div className="rounded-md bg-gray-50 p-4 text-center text-gray-500">
              Settings panel coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

type StatusFilter = "pending" | "approved" | "rejected" | "suspended" | "all";

export function InstitutionAdminList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch institutions based on filter
  const { data: institutions, refetch } = trpc.institution.getAll.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Mutations
  const approveMutation = trpc.institution.approve.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedInstitution(null);
    },
  });

  const rejectMutation = trpc.institution.reject.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedInstitution(null);
      setRejectionReason("");
    },
  });

  const suspendMutation = trpc.institution.suspend.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedInstitution(null);
      setRejectionReason("");
    },
  });

  const handleApprove = (id: string) => {
    if (confirm("Are you sure you want to approve this institution?")) {
      approveMutation.mutate({ id });
    }
  };

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    if (confirm("Are you sure you want to reject this institution?")) {
      rejectMutation.mutate({ id, reason: rejectionReason.trim() });
    }
  };

  const handleSuspend = (id: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for suspension");
      return;
    }

    if (confirm("Are you sure you want to suspend this institution?")) {
      suspendMutation.mutate({ id, reason: rejectionReason.trim() });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Institution Management</h1>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected", "suspended"] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Institution List */}
      <div className="space-y-4">
        {institutions?.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-8 text-center text-gray-500">
            No institutions found with status: {statusFilter}
          </div>
        ) : (
          institutions?.map((institution) => (
            <div key={institution.id} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{institution.name}</h3>
                    {getStatusBadge(institution.status)}
                  </div>

                  {institution.description && (
                    <p className="mt-2 text-sm text-gray-600">{institution.description}</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {institution.website && (
                      <div>
                        <span className="font-medium">Website:</span>{" "}
                        <a
                          href={institution.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {institution.website}
                        </a>
                      </div>
                    )}
                    {institution.email && (
                      <div>
                        <span className="font-medium">Email:</span> {institution.email}
                      </div>
                    )}
                    {institution.phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {institution.phone}
                      </div>
                    )}
                    {institution.address && (
                      <div>
                        <span className="font-medium">Address:</span> {institution.address}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Owner:</span> {institution.owner?.name} (
                      {institution.owner?.email})
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(institution.createdAt).toLocaleString()}
                    </div>
                    {institution.reviewedAt && (
                      <div>
                        <span className="font-medium">Reviewed:</span>{" "}
                        {new Date(institution.reviewedAt).toLocaleString()}
                      </div>
                    )}
                    {institution.rejectionReason && (
                      <div className="mt-2">
                        <span className="font-medium">Reason:</span> {institution.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-6 flex flex-col gap-2">
                  {institution.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(institution.id)}
                        disabled={approveMutation.isPending}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedInstitution(institution.id)}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {institution.status === "approved" && (
                    <button
                      onClick={() => setSelectedInstitution(institution.id)}
                      className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection/Suspension Form */}
              {selectedInstitution === institution.id && (
                <div className="mt-4 rounded-md border-t pt-4">
                  <label className="block text-sm font-medium">
                    Reason for {institution.status === "pending" ? "Rejection" : "Suspension"}
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Provide a detailed reason..."
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        if (institution.status === "pending") {
                          handleReject(institution.id);
                        } else {
                          handleSuspend(institution.id);
                        }
                      }}
                      disabled={rejectMutation.isPending || suspendMutation.isPending}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Confirm {institution.status === "pending" ? "Rejection" : "Suspension"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstitution(null);
                        setRejectionReason("");
                      }}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

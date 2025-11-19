"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useInstitution } from "@/lib/context/institution-context";
import Link from "next/link";

export function InstitutionSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeInstitution, setActiveInstitution, clearInstitution } = useInstitution();
  const { data: myInstitutions, isLoading } = trpc.institution.getMy.useQuery();

  const approvedInstitutions = myInstitutions?.filter((inst) => inst.status === "approved") || [];
  const pendingInstitutions = myInstitutions?.filter((inst) => inst.status === "pending") || [];

  if (isLoading) {
    return <div className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        {activeInstitution ? (
          <>
            <div className="flex flex-col items-start">
              <span className="font-semibold">{activeInstitution.name}</span>
              <span className="text-xs text-gray-500">Active Institution</span>
            </div>
          </>
        ) : (
          <span>Select Institution</span>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Your Institutions</h3>
                <Link
                  href="/institutions/register"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  + Register New
                </Link>
              </div>

              {approvedInstitutions.length === 0 && pendingInstitutions.length === 0 ? (
                <div className="rounded-md bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-600">No institutions yet</p>
                  <Link
                    href="/institutions/register"
                    className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    Register your first institution
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Approved Institutions */}
                  {approvedInstitutions.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-500">Active</p>
                      <div className="space-y-1">
                        {approvedInstitutions.map((institution) => (
                          <button
                            key={institution.id}
                            onClick={() => {
                              setActiveInstitution(institution);
                              setIsOpen(false);
                            }}
                            className={`w-full rounded-md p-3 text-left transition-colors ${
                              activeInstitution?.id === institution.id
                                ? "bg-blue-50 text-blue-900"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="font-medium">{institution.name}</div>
                            {institution.description && (
                              <div className="mt-1 text-xs text-gray-500 line-clamp-1">
                                {institution.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Institutions */}
                  {pendingInstitutions.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                        Pending Approval
                      </p>
                      <div className="space-y-1">
                        {pendingInstitutions.map((institution) => (
                          <div key={institution.id} className="rounded-md bg-yellow-50 p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{institution.name}</span>
                              <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                Pending
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-yellow-700">Awaiting admin approval</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clear Selection */}
                  {activeInstitution && (
                    <div className="border-t pt-3">
                      <button
                        onClick={() => {
                          clearInstitution();
                          setIsOpen(false);
                        }}
                        className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

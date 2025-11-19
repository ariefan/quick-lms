"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function MyCertificatesPage() {
  const router = useRouter();
  const { data: certificates, isLoading } = trpc.certificate.getMyCertificates.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">My Certificates</h1>
          <p className="text-gray-600">
            View and download your course completion certificates
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Total Certificates: <span className="font-semibold">{certificates?.length || 0}</span>
              </p>
            </div>
            <button
              onClick={() => router.push("/certificates/verify")}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Verify a Certificate
            </button>
          </div>
        </div>

        {/* Certificates Grid */}
        {!certificates || certificates.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">No Certificates Yet</h2>
            <p className="mb-6 text-gray-600">
              Complete courses to earn certificates of completion
            </p>
            <button
              onClick={() => router.push("/catalog")}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Certificate Icon */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <svg
                    className="h-8 w-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                {/* Certificate Info */}
                <h3 className="mb-2 font-semibold text-gray-900">{(certificate.course as any).title}</h3>
                <p className="mb-1 text-sm text-gray-600">{(certificate.institution as any).name}</p>
                <p className="mb-4 text-sm text-gray-500">
                  Issued {new Date(certificate.issuedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>

                {/* Certificate Number */}
                <div className="mb-4 rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Certificate Number</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {certificate.certificateNumber}
                  </p>
                </div>

                {/* Status Badge */}
                {certificate.revokedAt ? (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                      Revoked
                    </span>
                  </div>
                ) : certificate.expiresAt && new Date(certificate.expiresAt) < new Date() ? (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                      Expired
                    </span>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                      Valid
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/certificates/${certificate.id}`)}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/certificates/verify?code=${certificate.verificationCode}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert("Verification link copied!");
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    title="Copy verification link"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

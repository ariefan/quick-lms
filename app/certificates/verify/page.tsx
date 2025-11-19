"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { CertificateTemplate } from "@/components/certificate/certificate-template";

export default function VerifyCertificatePage() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || searchParams.get("number") || "";

  const [certificateNumber, setCertificateNumber] = useState(codeFromUrl);
  const [verificationCode, setVerificationCode] = useState(codeFromUrl);
  const [searchType, setSearchType] = useState<"number" | "code">("code");

  const { data: result, isLoading, refetch } = trpc.certificate.verifyCertificate.useQuery(
    {
      certificateNumber: searchType === "number" ? certificateNumber : undefined,
      verificationCode: searchType === "code" ? verificationCode : undefined,
    },
    {
      enabled: false, // Only run when user clicks verify
    }
  );

  const handleVerify = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">Verify Certificate</h1>
            <p className="text-gray-600">
              Enter a certificate number or verification code to verify its authenticity
            </p>
          </div>

          {/* Search Form */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search by:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="code"
                    checked={searchType === "code"}
                    onChange={(e) => setSearchType(e.target.value as "code")}
                    className="mr-2"
                  />
                  Verification Code
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="number"
                    checked={searchType === "number"}
                    onChange={(e) => setSearchType(e.target.value as "number")}
                    className="mr-2"
                  />
                  Certificate Number
                </label>
              </div>
            </div>

            {searchType === "code" ? (
              <div className="mb-4">
                <label htmlFor="verificationCode" className="mb-2 block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="Enter verification code (e.g., A1B2C3D4E5F6)"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="certificateNumber" className="mb-2 block text-sm font-medium text-gray-700">
                  Certificate Number
                </label>
                <input
                  type="text"
                  id="certificateNumber"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value.toUpperCase())}
                  placeholder="Enter certificate number (e.g., CERT-2025-A1B2C3)"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isLoading || (!certificateNumber && !verificationCode)}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify Certificate"}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Verification Status */}
              <div
                className={`rounded-lg border p-6 ${
                  result.valid
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  {result.valid ? (
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-8 w-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  <div>
                    <h2
                      className={`mb-2 text-xl font-bold ${
                        result.valid ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {result.valid ? "✓ Certificate Verified" : "✗ Verification Failed"}
                    </h2>
                    <p className={result.valid ? "text-green-700" : "text-red-700"}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              {result.valid && result.certificate && (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-semibold">Certificate Details</h3>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Recipient</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {result.certificate.user.name || result.certificate.user.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Course</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {result.certificate.course.title}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Institution</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {result.certificate.institution.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Issued Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(result.certificate.issuedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Certificate Number</dt>
                      <dd className="mt-1 font-mono text-sm text-gray-900">
                        {result.certificate.certificateNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Verification Code</dt>
                      <dd className="mt-1 font-mono text-sm text-gray-900">
                        {result.certificate.verificationCode}
                      </dd>
                    </div>
                  </dl>

                  {/* Certificate Preview */}
                  <div className="mt-6">
                    <h4 className="mb-4 text-sm font-medium text-gray-700">
                      Certificate Preview
                    </h4>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <CertificateTemplate
                        certificateNumber={result.certificate.certificateNumber}
                        studentName={
                          result.certificate.user.name || result.certificate.user.email
                        }
                        courseName={result.certificate.course.title}
                        institutionName={result.certificate.institution.name}
                        issuedDate={new Date(result.certificate.issuedAt)}
                        verificationCode={result.certificate.verificationCode}
                        customFields={result.certificate.customFields || undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

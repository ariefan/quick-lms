"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CertificateViewer } from "@/components/certificate/certificate-viewer";

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = params.id as string;

  const {
    data: certificate,
    isLoading,
    error,
  } = trpc.certificate.getCertificateById.useQuery({
    id: certificateId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Certificate Not Found</h1>
          <p className="mb-4 text-gray-600">
            {error?.message || "The certificate you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.push("/certificates")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View My Certificates
          </button>
        </div>
      </div>
    );
  }

  if (certificate.revokedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Certificate Revoked</h1>
          <p className="mb-4 text-gray-600">
            This certificate has been revoked on{" "}
            {new Date(certificate.revokedAt).toLocaleDateString()}.
          </p>
          <button
            onClick={() => router.push("/certificates")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View My Certificates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push("/certificates")}
            className="text-blue-600 hover:underline"
          >
            ← Back to My Certificates
          </button>
        </div>

        <CertificateViewer certificate={certificate as any} />
      </div>
    </div>
  );
}

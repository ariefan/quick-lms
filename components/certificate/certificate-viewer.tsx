"use client";

import React from "react";
import { CertificateTemplate } from "./certificate-template";

interface CertificateViewerProps {
  certificate: {
    id: string;
    certificateNumber: string;
    verificationCode: string;
    title: string;
    description: string;
    issuedAt: Date;
    user: {
      name: string | null;
      email: string;
    };
    course: {
      title: string;
    };
    institution: {
      name: string;
    };
    customFields?: Record<string, string>;
  };
}

export function CertificateViewer({ certificate }: CertificateViewerProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Trigger browser print dialog with PDF option
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/certificates/verify?code=${certificate.verificationCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: certificate.title,
          text: `Check out my certificate: ${certificate.course.title}`,
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert("Verification link copied to clipboard!");
      }
    } else {
      // Fallback to copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert("Verification link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-center gap-4 print:hidden">
        <button
          onClick={handleDownloadPDF}
          className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Download as PDF
        </button>
        <button
          onClick={handlePrint}
          className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          Print
        </button>
        <button
          onClick={handleShare}
          className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50"
        >
          Share
        </button>
      </div>

      {/* Certificate Preview */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <CertificateTemplate
          certificateNumber={certificate.certificateNumber}
          studentName={certificate.user.name || certificate.user.email}
          courseName={certificate.course.title}
          institutionName={certificate.institution.name}
          issuedDate={new Date(certificate.issuedAt)}
          verificationCode={certificate.verificationCode}
          customFields={certificate.customFields}
        />
      </div>

      {/* Certificate Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 print:hidden">
        <h2 className="mb-4 text-xl font-semibold">Certificate Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Certificate Number</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">
              {certificate.certificateNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Verification Code</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{certificate.verificationCode}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Issued On</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(certificate.issuedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Recipient</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {certificate.user.name || certificate.user.email}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Course</dt>
            <dd className="mt-1 text-sm text-gray-900">{certificate.course.title}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Institution</dt>
            <dd className="mt-1 text-sm text-gray-900">{certificate.institution.name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Verification URL</dt>
            <dd className="mt-1 text-sm text-blue-600">
              <a
                href={`/certificates/verify?code=${certificate.verificationCode}`}
                className="hover:underline"
              >
                {`${window.location.origin}/certificates/verify?code=${certificate.verificationCode}`}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

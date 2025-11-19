"use client";

import React from "react";

interface CertificateTemplateProps {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  institutionName: string;
  issuedDate: Date;
  verificationCode?: string;
  customFields?: Record<string, string>;
}

/**
 * Certificate Template - Default Design
 * Printable/downloadable as PDF using browser print functionality
 */
export function CertificateTemplate({
  certificateNumber,
  studentName,
  courseName,
  institutionName,
  issuedDate,
  verificationCode,
  customFields = {},
}: CertificateTemplateProps) {
  return (
    <div className="certificate-container mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="certificate-content border-8 border-double border-blue-600 p-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-serif font-bold text-blue-800">
            Certificate of Completion
          </h1>
          <div className="mx-auto mt-4 h-1 w-32 bg-blue-600"></div>
        </div>

        {/* Body */}
        <div className="mb-8 space-y-6 text-center">
          <p className="text-xl text-gray-700">This is to certify that</p>

          <p className="text-4xl font-serif font-bold text-gray-900">{studentName}</p>

          <p className="text-xl text-gray-700">has successfully completed the course</p>

          <p className="text-3xl font-semibold text-blue-800">{courseName}</p>

          <p className="text-lg text-gray-700">
            offered by <span className="font-semibold">{institutionName}</span>
          </p>

          {/* Custom Fields */}
          {Object.keys(customFields).length > 0 && (
            <div className="mt-6 space-y-2">
              {Object.entries(customFields).map(([key, value]) => (
                <p key={key} className="text-sm text-gray-600">
                  <span className="font-semibold">{key}:</span> {value}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-between border-t border-gray-300 pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Date of Issue</p>
            <p className="mt-1 font-semibold text-gray-900">
              {issuedDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">Certificate Number</p>
            <p className="mt-1 font-mono font-semibold text-gray-900">{certificateNumber}</p>
          </div>

          {verificationCode && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Verification Code</p>
              <p className="mt-1 font-mono text-xs font-semibold text-gray-900">
                {verificationCode}
              </p>
            </div>
          )}
        </div>

        {/* Watermark/Seal */}
        <div className="mt-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-600 bg-blue-50">
            <div className="text-center">
              <p className="text-xs font-bold text-blue-800">CERTIFIED</p>
              <p className="text-[10px] text-blue-600">{new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Instructions */}
      <div className="mt-6 text-center print:hidden">
        <p className="text-sm text-gray-600">
          To download as PDF, use your browser's print function and select "Save as PDF"
        </p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .certificate-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .certificate-content {
            page-break-inside: avoid;
          }

          /* Hide everything except certificate */
          body > *:not(.certificate-container) {
            display: none !important;
          }

          header,
          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

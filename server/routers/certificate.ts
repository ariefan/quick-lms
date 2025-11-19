/**
 * Certificate Router
 *
 * Handles certificate management:
 * - Issue certificates on course completion
 * - Certificate retrieval and verification
 * - Certificate revocation
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  certificates,
  enrollments,
} from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutions, institutionMembers } from "../db/schema/institutions";
import { eq, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Generate a unique certificate number
 * Format: CERT-YYYY-XXXXXX (e.g., CERT-2025-A1B2C3)
 */
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}-${randomPart}`;
}

/**
 * Generate a unique verification code
 * Format: 12-character alphanumeric code
 */
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 14).toUpperCase();
}

export const certificateRouter = createTRPCRouter({
  /**
   * Issue a certificate for a completed course
   * Can only be called by instructors/admins or automatically by the system
   */
  issueCertificate: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string(),
        template: z.string().default("default"),
        customFields: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { enrollmentId, template, customFields } = input;

      // Get enrollment with course and user details
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: eq(enrollments.id, enrollmentId),
        with: {
          course: true,
          user: true,
          institution: true,
        },
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      // Check if enrollment is completed
      if (enrollment.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Course must be completed before issuing certificate",
        });
      }

      // Check if certificate already exists for this enrollment
      const existingCertificate = await ctx.db.query.certificates.findFirst({
        where: eq(certificates.enrollmentId, enrollmentId),
      });

      if (existingCertificate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Certificate already issued for this enrollment",
        });
      }

      // Permission check: user must be course instructor, institution admin, or the student themselves
      const isStudent = ctx.session.userId === enrollment.userId;
      const isCourseInstructor = ctx.session.userId === (enrollment.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      // Get institution membership for permission check
      let isInstitutionAdmin = false;
      if (!isStudent && !isCourseInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, enrollment.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isStudent && !isCourseInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to issue certificates for this course",
        });
      }

      // Generate certificate number and verification code
      let certificateNumber = generateCertificateNumber();
      let verificationCode = generateVerificationCode();

      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await ctx.db.query.certificates.findFirst({
          where: or(
            eq(certificates.certificateNumber, certificateNumber),
            eq(certificates.verificationCode, verificationCode)
          ),
        });

        if (!existing) break;

        certificateNumber = generateCertificateNumber();
        verificationCode = generateVerificationCode();
        attempts++;
      }

      if (attempts === 10) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate unique certificate number",
        });
      }

      // Create certificate
      const certificate = await ctx.db
        .insert(certificates)
        .values({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          enrollmentId: enrollment.id,
          institutionId: enrollment.institutionId,
          certificateNumber,
          verificationCode,
          title: `Certificate of Completion - ${(enrollment.course as any).title}`,
          description: `This certifies that ${(enrollment.user as any).name || (enrollment.user as any).email} has successfully completed ${(enrollment.course as any).title}`,
          template,
          customFields: (customFields || {}) as Record<string, string>,
          isVerified: true,
          issuedAt: new Date(),
        })
        .returning();

      // Update enrollment to mark certificate as issued
      await ctx.db
        .update(enrollments)
        .set({
          certificateIssued: true,
          certificateIssuedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollmentId));

      return certificate[0];
    }),

  /**
   * Get all certificates for the current user
   */
  getMyCertificates: protectedProcedure.query(async ({ ctx }) => {
    const userCertificates = await ctx.db.query.certificates.findMany({
      where: eq(certificates.userId, ctx.session.userId),
      with: {
        course: true,
        institution: true,
      },
      orderBy: desc(certificates.issuedAt),
    });

    return userCertificates;
  }),

  /**
   * Get a specific certificate by ID
   */
  getCertificateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const certificate = await ctx.db.query.certificates.findFirst({
        where: eq(certificates.id, input.id),
        with: {
          course: true,
          user: true,
          institution: true,
          enrollment: true,
        },
      });

      if (!certificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

      // Permission check: user must be the certificate owner, course instructor, or admin
      const isOwner = ctx.session.userId === certificate.userId;
      const isCourseInstructor = ctx.session.userId === (certificate.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      // Get institution membership for permission check
      let isInstitutionAdmin = false;
      if (!isOwner && !isCourseInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, certificate.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isCourseInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this certificate",
        });
      }

      return certificate;
    }),

  /**
   * Verify a certificate by verification code or certificate number
   * This is a public-facing endpoint for certificate verification
   */
  verifyCertificate: protectedProcedure
    .input(
      z.object({
        certificateNumber: z.string().optional(),
        verificationCode: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { certificateNumber, verificationCode } = input;

      if (!certificateNumber && !verificationCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Certificate number or verification code is required",
        });
      }

      const certificate = await ctx.db.query.certificates.findFirst({
        where: certificateNumber
          ? eq(certificates.certificateNumber, certificateNumber)
          : eq(certificates.verificationCode, verificationCode!),
        with: {
          course: true,
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          institution: true,
        },
      });

      if (!certificate) {
        return {
          valid: false,
          message: "Certificate not found",
        };
      }

      if (certificate.revokedAt) {
        return {
          valid: false,
          message: "Certificate has been revoked",
          certificate,
        };
      }

      if (certificate.expiresAt && certificate.expiresAt < new Date()) {
        return {
          valid: false,
          message: "Certificate has expired",
          certificate,
        };
      }

      return {
        valid: true,
        message: "Certificate is valid",
        certificate,
      };
    }),

  /**
   * Get certificates for a specific user (instructor/admin only)
   */
  getUserCertificates: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only admins can view other users' certificates
      if (ctx.session.role !== "admin" && ctx.session.userId !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view certificates for other users",
        });
      }

      const userCertificates = await ctx.db.query.certificates.findMany({
        where: eq(certificates.userId, input.userId),
        with: {
          course: true,
          institution: true,
        },
        orderBy: desc(certificates.issuedAt),
      });

      return userCertificates;
    }),

  /**
   * Revoke a certificate (instructor/admin only)
   */
  revokeCertificate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const certificate = await ctx.db.query.certificates.findFirst({
        where: eq(certificates.id, input.id),
        with: {
          course: true,
        },
      });

      if (!certificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

      // Permission check: only course instructor, institution admin, or platform admin
      const isCourseInstructor = ctx.session.userId === (certificate.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      // Get institution membership for permission check
      let isInstitutionAdmin = false;
      if (!isCourseInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, certificate.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isCourseInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to revoke certificates",
        });
      }

      // Revoke certificate
      const updated = await ctx.db
        .update(certificates)
        .set({
          revokedAt: new Date(),
          isVerified: false,
        })
        .where(eq(certificates.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Get course certificates (for instructors to see all certificates issued for their course)
   */
  getCourseCertificates: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Permission check: must be course instructor, institution admin, or platform admin
      const isCourseInstructor = ctx.session.userId === (course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      // Get institution membership for permission check
      let isInstitutionAdmin = false;
      if (!isCourseInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, course.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isCourseInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view course certificates",
        });
      }

      const courseCertificates = await ctx.db.query.certificates.findMany({
        where: eq(certificates.courseId, input.courseId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          enrollment: true,
        },
        orderBy: desc(certificates.issuedAt),
      });

      return courseCertificates;
    }),
});

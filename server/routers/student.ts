/**
 * Student Router
 *
 * Handles student features: enrollments, progress tracking, reviews, wishlist
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  enrollments,
  lessonProgress,
  courseReviews,
  wishlists,
  certificates,
} from "../db/schema/lms";
import { courses } from "../db/schema/courses";

export const studentRouter = createTRPCRouter({
  // =============================================================================
  // ENROLLMENTS
  // =============================================================================

  /**
   * Enroll in a course
   */
  enroll: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get course details
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Check if course is published
      if (course.status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot enroll in unpublished course",
        });
      }

      // Check if already enrolled
      const existing = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already enrolled in this course",
        });
      }

      // Determine enrollment type based on price
      const enrollmentType = course.price === "0.00" || course.price === "0" ? "free" : "paid";

      // Create enrollment
      const [enrollment] = await ctx.db
        .insert(enrollments)
        .values({
          userId: ctx.session.userId,
          courseId: input.courseId,
          institutionId: course.institutionId,
          enrollmentType,
          status: "active",
        })
        .returning();

      return enrollment;
    }),

  /**
   * Unenroll from course
   */
  unenroll: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      // Update status to dropped instead of deleting
      await ctx.db
        .update(enrollments)
        .set({
          status: "dropped",
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollment.id));

      return { success: true };
    }),

  /**
   * Get enrollment status for a course
   */
  getEnrollmentStatus: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      return {
        isEnrolled: !!enrollment,
        enrollment: enrollment || null,
      };
    }),

  /**
   * Get all my enrollments
   */
  getMyEnrollments: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "completed", "dropped", "suspended"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(enrollments.userId, ctx.session.userId)];

      if (input?.status) {
        conditions.push(eq(enrollments.status, input.status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.query.enrollments.findMany({
        where,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: [desc(enrollments.lastAccessedAt)],
        with: {
          course: {
            with: {
              instructor: {
                columns: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
              institution: {
                columns: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              category: true,
            },
          },
        },
      });
    }),

  /**
   * Update enrollment (last accessed time, etc.)
   */
  updateEnrollment: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      await ctx.db
        .update(enrollments)
        .set({
          lastAccessedAt: new Date(),
          startedAt: enrollment.startedAt || new Date(),
        })
        .where(eq(enrollments.id, enrollment.id));

      return { success: true };
    }),

  // =============================================================================
  // LESSON PROGRESS
  // =============================================================================

  /**
   * Mark lesson as complete
   */
  markLessonComplete: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        courseId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check enrollment
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId),
          eq(enrollments.status, "active")
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Must be enrolled in course to track progress",
        });
      }

      // Get lesson details
      const lesson = await ctx.db.query.lessons.findFirst({
        where: eq(courses.id, input.lessonId),
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      // Check if progress record exists
      const existing = await ctx.db.query.lessonProgress.findFirst({
        where: and(
          eq(lessonProgress.userId, ctx.session.userId),
          eq(lessonProgress.lessonId, input.lessonId)
        ),
      });

      if (existing) {
        // Update existing
        await ctx.db
          .update(lessonProgress)
          .set({
            status: "completed",
            completionPercentage: 100,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          })
          .where(eq(lessonProgress.id, existing.id));
      } else {
        // Create new
        await ctx.db.insert(lessonProgress).values({
          userId: ctx.session.userId,
          lessonId: input.lessonId,
          courseId: input.courseId,
          institutionId: enrollment.institutionId,
          status: "completed",
          completionPercentage: 100,
          startedAt: new Date(),
          completedAt: new Date(),
        });
      }

      // Update enrollment progress
      await updateEnrollmentProgress(ctx.db, enrollment.id, input.courseId, ctx.session.userId);

      return { success: true };
    }),

  /**
   * Update lesson watch time/position
   */
  updateLessonProgress: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        courseId: z.string(),
        watchTime: z.number().optional(),
        lastPosition: z.number().optional(),
        completionPercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lessonId, courseId, ...updates } = input;

      // Check enrollment
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, "active")
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Must be enrolled in course to track progress",
        });
      }

      // Check if progress record exists
      const existing = await ctx.db.query.lessonProgress.findFirst({
        where: and(
          eq(lessonProgress.userId, ctx.session.userId),
          eq(lessonProgress.lessonId, lessonId)
        ),
      });

      if (existing) {
        // Update existing
        const status =
          updates.completionPercentage === 100
            ? "completed"
            : updates.completionPercentage && updates.completionPercentage > 0
              ? "in_progress"
              : existing.status;

        await ctx.db
          .update(lessonProgress)
          .set({
            ...updates,
            status,
            lastAccessedAt: new Date(),
            completedAt: status === "completed" ? new Date() : existing.completedAt,
          })
          .where(eq(lessonProgress.id, existing.id));
      } else {
        // Create new
        const status =
          updates.completionPercentage === 100
            ? "completed"
            : updates.completionPercentage && updates.completionPercentage > 0
              ? "in_progress"
              : "in_progress";

        await ctx.db.insert(lessonProgress).values({
          userId: ctx.session.userId,
          lessonId,
          courseId,
          institutionId: enrollment.institutionId,
          ...updates,
          status,
          startedAt: new Date(),
          completedAt: status === "completed" ? new Date() : undefined,
        });
      }

      return { success: true };
    }),

  /**
   * Get lesson progress
   */
  getLessonProgress: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(lessonProgress.userId, ctx.session.userId),
        eq(lessonProgress.courseId, input.courseId),
      ];

      if (input.lessonId) {
        conditions.push(eq(lessonProgress.lessonId, input.lessonId));
      }

      const where = and(...conditions);

      if (input.lessonId) {
        // Return single lesson progress
        return ctx.db.query.lessonProgress.findFirst({ where });
      } else {
        // Return all lesson progress for course
        return ctx.db.query.lessonProgress.findMany({ where });
      }
    }),

  /**
   * Get course progress summary
   */
  getCourseProgress: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      if (!enrollment) {
        return null;
      }

      const progress = await ctx.db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.userId, ctx.session.userId),
          eq(lessonProgress.courseId, input.courseId)
        ),
      });

      return {
        enrollment,
        lessonProgress: progress,
        totalCompleted: progress.filter((p) => p.status === "completed").length,
        totalInProgress: progress.filter((p) => p.status === "in_progress").length,
      };
    }),

  // =============================================================================
  // REVIEWS
  // =============================================================================

  /**
   * Create course review
   */
  createReview: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if enrolled
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, input.courseId)
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Must be enrolled in course to leave a review",
        });
      }

      // Check if already reviewed
      const existing = await ctx.db.query.courseReviews.findFirst({
        where: and(
          eq(courseReviews.userId, ctx.session.userId),
          eq(courseReviews.courseId, input.courseId)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already reviewed this course",
        });
      }

      const [review] = await ctx.db
        .insert(courseReviews)
        .values({
          userId: ctx.session.userId,
          courseId: input.courseId,
          institutionId: enrollment.institutionId,
          rating: input.rating,
          title: input.title,
          content: input.content,
          isVerifiedPurchase: enrollment.enrollmentType === "paid",
        })
        .returning();

      return review;
    }),

  /**
   * Get course reviews
   */
  getCourseReviews: publicProcedure
    .input(
      z.object({
        courseId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.courseReviews.findMany({
        where: and(eq(courseReviews.courseId, input.courseId), eq(courseReviews.isApproved, true)),
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(courseReviews.createdAt)],
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
    }),

  /**
   * Get my review for a course
   */
  getMyReview: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.courseReviews.findFirst({
        where: and(
          eq(courseReviews.userId, ctx.session.userId),
          eq(courseReviews.courseId, input.courseId)
        ),
      });
    }),

  // =============================================================================
  // WISHLIST
  // =============================================================================

  /**
   * Add course to wishlist
   */
  addToWishlist: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already in wishlist
      const existing = await ctx.db.query.wishlists.findFirst({
        where: and(
          eq(wishlists.userId, ctx.session.userId),
          eq(wishlists.courseId, input.courseId)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Course already in wishlist",
        });
      }

      await ctx.db.insert(wishlists).values({
        userId: ctx.session.userId,
        courseId: input.courseId,
      });

      return { success: true };
    }),

  /**
   * Remove course from wishlist
   */
  removeFromWishlist: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(wishlists)
        .where(
          and(eq(wishlists.userId, ctx.session.userId), eq(wishlists.courseId, input.courseId))
        );

      return { success: true };
    }),

  /**
   * Get my wishlist
   */
  getMyWishlist: protectedProcedure.query(async ({ ctx }) => {
    const wishlistItems = await ctx.db.query.wishlists.findMany({
      where: eq(wishlists.userId, ctx.session.userId),
      orderBy: [desc(wishlists.createdAt)],
      with: {
        course: {
          with: {
            instructor: {
              columns: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            institution: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
            category: true,
          },
        },
      },
    });

    return wishlistItems;
  }),

  /**
   * Check if course is in wishlist
   */
  isInWishlist: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.wishlists.findFirst({
        where: and(
          eq(wishlists.userId, ctx.session.userId),
          eq(wishlists.courseId, input.courseId)
        ),
      });

      return { isInWishlist: !!item };
    }),
});

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

/**
 * Helper: Update enrollment progress based on completed lessons
 */
async function updateEnrollmentProgress(
  db: any,
  enrollmentId: string,
  courseId: string,
  userId: string
) {
  // Get total lessons in course
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  if (!course) return;

  // Get enrollment details
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
    with: {
      user: true,
    },
  });

  if (!enrollment) return;

  // Get completed lessons count
  const completedLessons = await db.query.lessonProgress.findMany({
    where: and(
      eq(lessonProgress.userId, userId),
      eq(lessonProgress.courseId, courseId),
      eq(lessonProgress.status, "completed")
    ),
  });

  const completedCount = completedLessons.length;
  const totalLessons = course.totalLessons || 1;
  const progress = Math.round((completedCount / totalLessons) * 100);

  const wasCompleted = enrollment.status === "completed";
  const isNowCompleted = progress === 100;

  // Update enrollment
  await db
    .update(enrollments)
    .set({
      progress,
      completedLessons: completedCount,
      updatedAt: new Date(),
      status: isNowCompleted ? "completed" : "active",
      completedAt: isNowCompleted ? new Date() : null,
    })
    .where(eq(enrollments.id, enrollmentId));

  // Auto-issue certificate if course just completed and certificate not already issued
  if (isNowCompleted && !wasCompleted && !enrollment.certificateIssued) {
    try {
      // Check if certificate already exists for this enrollment (extra safety check)
      const existingCertificate = await db.query.certificates.findFirst({
        where: eq(certificates.enrollmentId, enrollmentId),
      });

      if (!existingCertificate) {
        // Generate unique certificate number and verification code
        let certificateNumber = generateCertificateNumber();
        let verificationCode = generateVerificationCode();

        // Ensure uniqueness
        let attempts = 0;
        while (attempts < 10) {
          const existing = await db.query.certificates.findFirst({
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

        if (attempts < 10) {
          // Create certificate
          await db.insert(certificates).values({
            userId: enrollment.userId,
            courseId: enrollment.courseId,
            enrollmentId: enrollment.id,
            institutionId: enrollment.institutionId,
            certificateNumber,
            verificationCode,
            title: `Certificate of Completion - ${course.title}`,
            description: `This certifies that ${enrollment.user.name || enrollment.user.email} has successfully completed ${course.title}`,
            template: "default",
            customFields: {},
            isVerified: true,
            issuedAt: new Date(),
          });

          // Update enrollment to mark certificate as issued
          await db
            .update(enrollments)
            .set({
              certificateIssued: true,
              certificateIssuedAt: new Date(),
            })
            .where(eq(enrollments.id, enrollmentId));
        }
      }
    } catch (error) {
      // Log error but don't fail the enrollment update
      console.error("Failed to auto-issue certificate:", error);
    }
  }
}

/**
 * Assignment tRPC Router
 *
 * Handles assignment operations:
 * - Assignment CRUD (create, read, update, delete)
 * - Student submissions
 * - Grading and feedback
 * - Late submission handling
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assignments, assignmentSubmissions, enrollments } from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user can manage assignments in a course
 */
async function canManageAssignment(db: any, courseId: string, userId: string): Promise<boolean> {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  if (!course) return false;

  // Course instructor can manage
  if (course.instructorId === userId) return true;

  // Institution admins can manage
  const membership = await db.query.institutionMembers.findFirst({
    where: and(
      eq(institutionMembers.userId, userId),
      eq(institutionMembers.institutionId, course.institutionId),
      eq(institutionMembers.role, "admin")
    ),
  });

  return !!membership;
}

/**
 * Calculate late submission penalty
 */
function calculateLatePenalty(dueDate: Date | null, submittedAt: Date, penalty: number): number {
  if (!dueDate || submittedAt <= dueDate) {
    return 0;
  }
  return penalty;
}

// =============================================================================
// ROUTER
// =============================================================================

export const assignmentRouter = createTRPCRouter({
  /**
   * Create a new assignment
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        instructions: z.string().optional(),
        courseId: z.string(),
        lessonId: z.string().optional(),
        maxScore: z.number().int().min(1).default(100),
        dueDate: z.date().optional(),
        allowLateSubmission: z.boolean().default(false),
        lateSubmissionPenalty: z.number().int().min(0).max(100).default(0),
        allowedFileTypes: z.array(z.string()).default([]),
        maxFileSize: z.number().int().min(1).default(10485760), // 10MB
        maxFiles: z.number().int().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const canManage = await canManageAssignment(ctx.db, input.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create assignments in this course",
        });
      }

      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const [assignment] = await ctx.db
        .insert(assignments)
        .values({
          ...input,
          institutionId: course.institutionId,
        })
        .returning();

      return assignment;
    }),

  /**
   * Get assignment by ID
   */
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const assignment = await ctx.db.query.assignments.findFirst({
      where: eq(assignments.id, input.id),
      with: {
        course: {
          columns: { id: true, title: true, institutionId: true },
        },
      },
    });

    if (!assignment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
    }

    // Check if user is enrolled or can manage
    const canManage = await canManageAssignment(ctx.db, assignment.courseId, ctx.session.userId);
    const enrollment = await ctx.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, ctx.session.userId),
        eq(enrollments.courseId, assignment.courseId)
      ),
    });

    if (!canManage && !enrollment) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    return assignment;
  }),

  /**
   * Get all assignments for a course
   */
  getCourseAssignments: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignmentList = await ctx.db.query.assignments.findMany({
        where: eq(assignments.courseId, input.courseId),
        orderBy: (assignments, { desc }) => [desc(assignments.createdAt)],
      });

      return assignmentList;
    }),

  /**
   * Update assignment
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        instructions: z.string().optional(),
        maxScore: z.number().int().min(1).optional(),
        dueDate: z.date().optional(),
        allowLateSubmission: z.boolean().optional(),
        lateSubmissionPenalty: z.number().int().min(0).max(100).optional(),
        allowedFileTypes: z.array(z.string()).optional(),
        maxFileSize: z.number().int().min(1).optional(),
        maxFiles: z.number().int().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.query.assignments.findFirst({
        where: eq(assignments.id, input.id),
      });

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      }

      const canManage = await canManageAssignment(ctx.db, assignment.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(assignments)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(assignments.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete assignment
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.query.assignments.findFirst({
        where: eq(assignments.id, input.id),
      });

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      }

      const canManage = await canManageAssignment(ctx.db, assignment.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.delete(assignments).where(eq(assignments.id, input.id));
      return { success: true };
    }),

  // ===========================================================================
  // SUBMISSIONS
  // ===========================================================================

  /**
   * Submit assignment
   */
  submit: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        content: z.string().optional(),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              url: z.string(),
              size: z.number(),
              type: z.string(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.query.assignments.findFirst({
        where: eq(assignments.id, input.assignmentId),
      });

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      }

      if (!assignment.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment is not active" });
      }

      // Check enrollment
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, assignment.courseId),
          eq(enrollments.status, "active")
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be enrolled in this course",
        });
      }

      // Check for existing submission
      const existingSubmission = await ctx.db.query.assignmentSubmissions.findFirst({
        where: and(
          eq(assignmentSubmissions.userId, ctx.session.userId),
          eq(assignmentSubmissions.assignmentId, input.assignmentId)
        ),
      });

      const now = new Date();
      const isLate = assignment.dueDate ? now > assignment.dueDate : false;

      // Check if late submission is allowed
      if (isLate && !assignment.allowLateSubmission) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Late submissions are not allowed for this assignment",
        });
      }

      // If resubmission, update existing
      if (existingSubmission) {
        const [updated] = await ctx.db
          .update(assignmentSubmissions)
          .set({
            content: input.content || null,
            attachments: input.attachments,
            status: "submitted",
            submittedAt: now,
            isLate,
            updatedAt: now,
          })
          .where(eq(assignmentSubmissions.id, existingSubmission.id))
          .returning();

        return updated;
      }

      // Create new submission
      const [submission] = await ctx.db
        .insert(assignmentSubmissions)
        .values({
          userId: ctx.session.userId,
          assignmentId: input.assignmentId,
          courseId: assignment.courseId,
          institutionId: assignment.institutionId,
          content: input.content || null,
          attachments: input.attachments,
          status: "submitted",
          submittedAt: now,
          isLate,
        })
        .returning();

      return submission;
    }),

  /**
   * Grade submission (instructor/admin only)
   */
  gradeSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        score: z.number().int().min(0),
        feedback: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.query.assignmentSubmissions.findFirst({
        where: eq(assignmentSubmissions.id, input.submissionId),
        with: {
          assignment: true,
        },
      });

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      const canManage = await canManageAssignment(ctx.db, submission.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (input.score > submission.assignment.maxScore) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Score cannot exceed maximum score of ${submission.assignment.maxScore}`,
        });
      }

      // Apply late penalty if applicable
      let finalScore = input.score;
      if (submission.isLate && submission.assignment.lateSubmissionPenalty > 0) {
        const penalty = Math.round(
          (input.score * submission.assignment.lateSubmissionPenalty) / 100
        );
        finalScore = Math.max(0, input.score - penalty);
      }

      const [updated] = await ctx.db
        .update(assignmentSubmissions)
        .set({
          score: finalScore,
          feedback: input.feedback || null,
          status: "graded",
          gradedAt: new Date(),
          gradedBy: ctx.session.userId,
          updatedAt: new Date(),
        })
        .where(eq(assignmentSubmissions.id, input.submissionId))
        .returning();

      return updated;
    }),

  /**
   * Get my submission for an assignment
   */
  getMySubmission: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const submission = await ctx.db.query.assignmentSubmissions.findFirst({
        where: and(
          eq(assignmentSubmissions.userId, ctx.session.userId),
          eq(assignmentSubmissions.assignmentId, input.assignmentId)
        ),
        with: {
          assignment: true,
        },
      });

      return submission;
    }),

  /**
   * Get all submissions for an assignment (instructor/admin only)
   */
  getAssignmentSubmissions: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.query.assignments.findFirst({
        where: eq(assignments.id, input.assignmentId),
      });

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      }

      const canManage = await canManageAssignment(ctx.db, assignment.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const submissions = await ctx.db.query.assignmentSubmissions.findMany({
        where: eq(assignmentSubmissions.assignmentId, input.assignmentId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (submissions, { desc }) => [desc(submissions.submittedAt)],
      });

      return submissions;
    }),

  /**
   * Get submission by ID (for grading)
   */
  getSubmissionById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const submission = await ctx.db.query.assignmentSubmissions.findFirst({
        where: eq(assignmentSubmissions.id, input.id),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          assignment: true,
        },
      });

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      // Check permissions
      const canManage = await canManageAssignment(ctx.db, submission.courseId, ctx.session.userId);
      if (!canManage && submission.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return submission;
    }),
});

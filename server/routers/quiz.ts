/**
 * Quiz tRPC Router
 *
 * Handles quiz and assessment operations:
 * - Quiz CRUD (create, read, update, delete)
 * - Question management
 * - Quiz attempts and submissions
 * - Auto-grading logic
 * - Quiz results and analytics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { quizzes, quizQuestions, quizAttempts, quizAnswers, enrollments } from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user can manage quizzes in a course
 */
async function canManageQuiz(db: any, courseId: string, userId: string): Promise<boolean> {
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
 * Calculate quiz attempt score with auto-grading
 */
function calculateQuizScore(
  questions: Array<{ id: string; questionType: string; points: number; correctAnswers: string[] }>,
  answers: Array<{ questionId: string; selectedOptions: string[]; textAnswer: string | null }>
): {
  score: number;
  maxScore: number;
  correctAnswers: number;
  details: Map<string, { isCorrect: boolean; points: number }>;
} {
  let score = 0;
  let correctAnswersCount = 0;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const details = new Map<string, { isCorrect: boolean; points: number }>();

  for (const question of questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) {
      details.set(question.id, { isCorrect: false, points: 0 });
      continue;
    }

    let isCorrect = false;
    let pointsEarned = 0;

    switch (question.questionType) {
      case "single_choice":
      case "true_false":
        // Single correct answer
        isCorrect =
          answer.selectedOptions.length === 1 &&
          question.correctAnswers.includes(answer.selectedOptions[0]);
        break;

      case "multiple_choice":
        // All correct answers must be selected, no extra
        const sortedSelected = [...answer.selectedOptions].sort();
        const sortedCorrect = [...question.correctAnswers].sort();
        isCorrect =
          sortedSelected.length === sortedCorrect.length &&
          sortedSelected.every((val, idx) => val === sortedCorrect[idx]);
        break;

      case "short_answer":
        // Case-insensitive exact match for short answer
        // Note: In production, you might want fuzzy matching or instructor review
        isCorrect = question.correctAnswers.some(
          (correct) => correct.toLowerCase().trim() === answer.textAnswer?.toLowerCase().trim()
        );
        break;

      case "essay":
        // Essays require manual grading
        isCorrect = false;
        break;

      default:
        isCorrect = false;
    }

    if (isCorrect) {
      pointsEarned = question.points;
      score += pointsEarned;
      correctAnswersCount++;
    }

    details.set(question.id, { isCorrect, points: pointsEarned });
  }

  return { score, maxScore, correctAnswers: correctAnswersCount, details };
}

// =============================================================================
// ROUTER
// =============================================================================

export const quizRouter = createTRPCRouter({
  /**
   * Create a new quiz
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        instructions: z.string().optional(),
        courseId: z.string(),
        lessonId: z.string().optional(),
        timeLimit: z.number().int().min(1).optional(),
        passingScore: z.number().int().min(0).max(100).default(70),
        maxAttempts: z.number().int().min(1).default(3),
        shuffleQuestions: z.boolean().default(false),
        shuffleOptions: z.boolean().default(false),
        showResults: z.boolean().default(true),
        showCorrectAnswers: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const canManage = await canManageQuiz(ctx.db, input.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create quizzes in this course",
        });
      }

      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const [quiz] = await ctx.db
        .insert(quizzes)
        .values({
          ...input,
          institutionId: course.institutionId,
        })
        .returning();

      return quiz;
    }),

  /**
   * Get quiz by ID with questions
   */
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const quiz = await ctx.db.query.quizzes.findFirst({
      where: eq(quizzes.id, input.id),
      with: {
        course: {
          columns: { id: true, title: true, institutionId: true },
        },
        questions: {
          orderBy: (questions, { asc }) => [asc(questions.displayOrder)],
        },
      },
    });

    if (!quiz) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
    }

    // Check if user is enrolled or can manage
    const canManage = await canManageQuiz(ctx.db, quiz.courseId, ctx.session.userId);
    const enrollment = await ctx.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, ctx.session.userId),
        eq(enrollments.courseId, quiz.courseId)
      ),
    });

    if (!canManage && !enrollment) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    // Hide correct answers for students taking the quiz
    if (!canManage) {
      quiz.questions = quiz.questions.map((q: any) => ({
        ...q,
        correctAnswers: [],
        options: q.options.map((opt: any) => ({ ...opt, isCorrect: false })),
      }));
    }

    return quiz;
  }),

  /**
   * Get all quizzes for a course
   */
  getCourseQuizzes: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const quizList = await ctx.db.query.quizzes.findMany({
        where: eq(quizzes.courseId, input.courseId),
        with: {
          questions: {
            columns: { id: true },
          },
        },
        orderBy: (quizzes, { desc }) => [desc(quizzes.createdAt)],
      });

      return quizList.map((quiz) => ({
        ...quiz,
        questionCount: quiz.questions.length,
        questions: undefined,
      }));
    }),

  /**
   * Update quiz
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        instructions: z.string().optional(),
        timeLimit: z.number().int().min(1).optional(),
        passingScore: z.number().int().min(0).max(100).optional(),
        maxAttempts: z.number().int().min(1).optional(),
        shuffleQuestions: z.boolean().optional(),
        shuffleOptions: z.boolean().optional(),
        showResults: z.boolean().optional(),
        showCorrectAnswers: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.query.quizzes.findFirst({
        where: eq(quizzes.id, input.id),
      });

      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }

      const canManage = await canManageQuiz(ctx.db, quiz.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(quizzes)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(quizzes.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete quiz
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.query.quizzes.findFirst({
        where: eq(quizzes.id, input.id),
      });

      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }

      const canManage = await canManageQuiz(ctx.db, quiz.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.delete(quizzes).where(eq(quizzes.id, input.id));
      return { success: true };
    }),

  // ===========================================================================
  // QUESTION MANAGEMENT
  // ===========================================================================

  /**
   * Create quiz question
   */
  createQuestion: protectedProcedure
    .input(
      z.object({
        quizId: z.string(),
        question: z.string().min(1),
        questionType: z.enum([
          "multiple_choice",
          "single_choice",
          "true_false",
          "short_answer",
          "essay",
        ]),
        explanation: z.string().optional(),
        points: z.number().int().min(1).default(1),
        displayOrder: z.number().int().default(0),
        options: z
          .array(
            z.object({
              id: z.string(),
              text: z.string(),
              isCorrect: z.boolean(),
            })
          )
          .default([]),
        correctAnswers: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.query.quizzes.findFirst({
        where: eq(quizzes.id, input.quizId),
      });

      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }

      const canManage = await canManageQuiz(ctx.db, quiz.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const [question] = await ctx.db.insert(quizQuestions).values(input).returning();

      return question;
    }),

  /**
   * Update quiz question
   */
  updateQuestion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        question: z.string().min(1).optional(),
        questionType: z
          .enum(["multiple_choice", "single_choice", "true_false", "short_answer", "essay"])
          .optional(),
        explanation: z.string().optional(),
        points: z.number().int().min(1).optional(),
        displayOrder: z.number().int().optional(),
        options: z
          .array(
            z.object({
              id: z.string(),
              text: z.string(),
              isCorrect: z.boolean(),
            })
          )
          .optional(),
        correctAnswers: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.query.quizQuestions.findFirst({
        where: eq(quizQuestions.id, input.id),
        with: {
          quiz: true,
        },
      });

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      const canManage = await canManageQuiz(
        ctx.db,
        (question.quiz as any).courseId,
        ctx.session.userId
      );
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(quizQuestions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(quizQuestions.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete quiz question
   */
  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.db.query.quizQuestions.findFirst({
        where: eq(quizQuestions.id, input.id),
        with: {
          quiz: true,
        },
      });

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      const canManage = await canManageQuiz(
        ctx.db,
        (question.quiz as any).courseId,
        ctx.session.userId
      );
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await ctx.db.delete(quizQuestions).where(eq(quizQuestions.id, input.id));
      return { success: true };
    }),

  // ===========================================================================
  // QUIZ ATTEMPTS
  // ===========================================================================

  /**
   * Start a quiz attempt
   */
  startAttempt: protectedProcedure
    .input(z.object({ quizId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quiz = await ctx.db.query.quizzes.findFirst({
        where: eq(quizzes.id, input.quizId),
        with: {
          questions: {
            where: eq(quizQuestions.isActive, true),
          },
        },
      });

      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }

      if (!quiz.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quiz is not active" });
      }

      // Check enrollment
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, ctx.session.userId),
          eq(enrollments.courseId, quiz.courseId),
          eq(enrollments.status, "active")
        ),
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be enrolled in this course",
        });
      }

      // Check attempt count
      const previousAttempts = await ctx.db.query.quizAttempts.findMany({
        where: and(
          eq(quizAttempts.userId, ctx.session.userId),
          eq(quizAttempts.quizId, input.quizId)
        ),
      });

      if (previousAttempts.length >= quiz.maxAttempts) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum ${quiz.maxAttempts} attempts allowed`,
        });
      }

      const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);

      const [attempt] = await ctx.db
        .insert(quizAttempts)
        .values({
          userId: ctx.session.userId,
          quizId: input.quizId,
          courseId: quiz.courseId,
          institutionId: quiz.institutionId,
          attemptNumber: previousAttempts.length + 1,
          status: "in_progress",
          totalQuestions: quiz.questions.length,
          maxScore,
          timeLimit: quiz.timeLimit,
        })
        .returning();

      return attempt;
    }),

  /**
   * Submit quiz attempt with answers
   */
  submitAttempt: protectedProcedure
    .input(
      z.object({
        attemptId: z.string(),
        answers: z.array(
          z.object({
            questionId: z.string(),
            selectedOptions: z.array(z.string()).default([]),
            textAnswer: z.string().optional(),
          })
        ),
        timeSpent: z.number().int().min(0), // seconds
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.query.quizAttempts.findFirst({
        where: eq(quizAttempts.id, input.attemptId),
        with: {
          quiz: {
            with: {
              questions: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      }

      if (attempt.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (attempt.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Attempt already submitted" });
      }

      // Calculate score with auto-grading
      const { score, maxScore, correctAnswers, details } = calculateQuizScore(
        (attempt.quiz as any).questions.map((q: any) => ({
          ...q,
          correctAnswers: q.correctAnswers || [],
        })),
        input.answers.map((a) => ({
          ...a,
          textAnswer: a.textAnswer || null,
        }))
      );

      const scorePercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = scorePercentage >= (attempt.quiz as any).passingScore;

      // Insert quiz answers
      const answerInserts = input.answers.map((answer) => {
        const questionDetails = details.get(answer.questionId);
        return {
          attemptId: input.attemptId,
          questionId: answer.questionId,
          userId: ctx.session.userId,
          selectedOptions: answer.selectedOptions,
          textAnswer: answer.textAnswer || null,
          isCorrect: questionDetails?.isCorrect || false,
          points: questionDetails?.points || 0,
        };
      });

      if (answerInserts.length > 0) {
        await ctx.db.insert(quizAnswers).values(answerInserts);
      }

      // Update attempt
      const [updatedAttempt] = await ctx.db
        .update(quizAttempts)
        .set({
          status: "completed",
          score: scorePercentage,
          correctAnswers,
          passed,
          timeSpent: input.timeSpent,
          completedAt: new Date(),
          submittedAt: new Date(),
        })
        .where(eq(quizAttempts.id, input.attemptId))
        .returning();

      return updatedAttempt;
    }),

  /**
   * Get quiz attempt results
   */
  getAttemptResults: protectedProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.db.query.quizAttempts.findFirst({
        where: eq(quizAttempts.id, input.attemptId),
        with: {
          quiz: {
            with: {
              questions: true,
            },
          },
          answers: true,
        },
      });

      if (!attempt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      }

      // Check permissions
      const canManage = await canManageQuiz(ctx.db, attempt.courseId, ctx.session.userId);
      if (!canManage && attempt.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return attempt;
    }),

  /**
   * Get user's quiz attempts
   */
  getMyAttempts: protectedProcedure
    .input(z.object({ quizId: z.string() }))
    .query(async ({ ctx, input }) => {
      const attempts = await ctx.db.query.quizAttempts.findMany({
        where: and(
          eq(quizAttempts.userId, ctx.session.userId),
          eq(quizAttempts.quizId, input.quizId)
        ),
        orderBy: (attempts, { desc }) => [desc(attempts.startedAt)],
      });

      return attempts;
    }),

  /**
   * Get all attempts for a quiz (instructor/admin only)
   */
  getQuizAttempts: protectedProcedure
    .input(z.object({ quizId: z.string() }))
    .query(async ({ ctx, input }) => {
      const quiz = await ctx.db.query.quizzes.findFirst({
        where: eq(quizzes.id, input.quizId),
      });

      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }

      const canManage = await canManageQuiz(ctx.db, quiz.courseId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const attempts = await ctx.db.query.quizAttempts.findMany({
        where: eq(quizAttempts.quizId, input.quizId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (attempts, { desc }) => [desc(attempts.startedAt)],
      });

      return attempts;
    }),
});

/**
 * Analytics Router
 *
 * Handles analytics and reporting:
 * - Instructor course analytics
 * - Admin platform analytics
 * - Student progress reports
 * - Export functionality
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  enrollments,
  lessonProgress,
  quizzes,
  quizAttempts,
  assignments,
  assignmentSubmissions,
} from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { users } from "../db/schema/auth";
import { institutions, institutionMembers } from "../db/schema/institutions";
import { eq, and, desc, sql, count, avg, gte, lte, between } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const analyticsRouter = createTRPCRouter({
  /**
   * Get instructor course analytics
   * Returns enrollment stats, completion rates, and student activity
   */
  getInstructorCourseAnalytics: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { courseId, startDate, endDate } = input;

      // Verify instructor access
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const isInstructor = ctx.session.userId === (course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, (course as any).institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view course analytics",
        });
      }

      // Build date filter
      const dateFilter =
        startDate && endDate
          ? and(gte(enrollments.createdAt, startDate), lte(enrollments.createdAt, endDate))
          : undefined;

      // Get total enrollments
      const enrollmentStats = await ctx.db
        .select({ count: count() })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, courseId), dateFilter));

      const totalEnrollments = enrollmentStats[0]?.count || 0;

      // Get active enrollments
      const activeEnrollments = await ctx.db
        .select({ count: count() })
        .from(enrollments)
        .where(
          and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active"), dateFilter)
        );

      const activeCount = activeEnrollments[0]?.count || 0;

      // Get completed enrollments
      const completedEnrollments = await ctx.db
        .select({ count: count() })
        .from(enrollments)
        .where(
          and(eq(enrollments.courseId, courseId), eq(enrollments.status, "completed"), dateFilter)
        );

      const completedCount = completedEnrollments[0]?.count || 0;

      // Calculate completion rate
      const completionRate =
        totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;

      // Get average progress
      const avgProgressResult = await ctx.db
        .select({ avgProgress: avg(enrollments.progress) })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, courseId), dateFilter));

      const averageProgress = avgProgressResult[0]?.avgProgress
        ? Math.round(Number(avgProgressResult[0].avgProgress))
        : 0;

      // Get quiz statistics
      const courseQuizzes = await ctx.db.query.quizzes.findMany({
        where: eq(quizzes.courseId, courseId),
      });

      const quizIds = courseQuizzes.map((q) => q.id);

      let averageQuizScore = 0;
      if (quizIds.length > 0) {
        const quizScoreResult = await ctx.db
          .select({ avgScore: avg(quizAttempts.score) })
          .from(quizAttempts)
          .where(
            sql`${quizAttempts.quizId} IN ${sql.raw(`(${quizIds.map(() => "?").join(",")})`)} AND ${quizAttempts.status} = 'completed'`
          );

        averageQuizScore = quizScoreResult[0]?.avgScore
          ? Math.round(Number(quizScoreResult[0].avgScore))
          : 0;
      }

      // Get assignment statistics
      const courseAssignments = await ctx.db.query.assignments.findMany({
        where: eq(assignments.courseId, courseId),
      });

      const assignmentIds = courseAssignments.map((a) => a.id);

      let averageAssignmentScore = 0;
      if (assignmentIds.length > 0) {
        const assignmentScoreResult = await ctx.db
          .select({ avgScore: avg(assignmentSubmissions.score) })
          .from(assignmentSubmissions)
          .where(
            sql`${assignmentSubmissions.assignmentId} IN ${sql.raw(`(${assignmentIds.map(() => "?").join(",")})`)} AND ${assignmentSubmissions.status} = 'graded'`
          );

        averageAssignmentScore = assignmentScoreResult[0]?.avgScore
          ? Math.round(Number(assignmentScoreResult[0].avgScore))
          : 0;
      }

      // Get recent enrollments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEnrollments = await ctx.db
        .select({ count: count() })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, courseId), gte(enrollments.createdAt, thirtyDaysAgo)));

      const recentEnrollmentCount = recentEnrollments[0]?.count || 0;

      return {
        courseId,
        courseName: course.title,
        enrollmentStats: {
          total: totalEnrollments,
          active: activeCount,
          completed: completedCount,
          recentEnrollments: recentEnrollmentCount,
        },
        progressStats: {
          completionRate,
          averageProgress,
        },
        assessmentStats: {
          averageQuizScore,
          averageAssignmentScore,
          totalQuizzes: courseQuizzes.length,
          totalAssignments: courseAssignments.length,
        },
      };
    }),

  /**
   * Get instructor dashboard overview
   * Returns aggregated stats across all instructor's courses
   */
  getInstructorDashboard: protectedProcedure.query(async ({ ctx }) => {
    // Get all courses taught by this instructor
    const instructorCourses = await ctx.db.query.courses.findMany({
      where: eq(courses.instructorId, ctx.session.userId),
    });

    const courseIds = instructorCourses.map((c) => c.id);

    if (courseIds.length === 0) {
      return {
        totalCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
        avgCompletionRate: 0,
        recentActivity: [],
      };
    }

    // Get total students across all courses
    const totalStudentsResult = await ctx.db
      .select({ count: count() })
      .from(enrollments)
      .where(sql`${enrollments.courseId} IN ${sql.raw(`(${courseIds.map(() => "?").join(",")})`)}`);

    const totalStudents = totalStudentsResult[0]?.count || 0;

    // Get average completion rate
    const completionStats = await ctx.db
      .select({
        completed: count(),
      })
      .from(enrollments)
      .where(
        and(
          sql`${enrollments.courseId} IN ${sql.raw(`(${courseIds.map(() => "?").join(",")})`)}`,
          eq(enrollments.status, "completed")
        )
      );

    const completedCount = completionStats[0]?.completed || 0;
    const avgCompletionRate =
      totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

    // Get recent activity (last 10 enrollments)
    const recentActivity = await ctx.db.query.enrollments.findMany({
      where: sql`${enrollments.courseId} IN ${sql.raw(`(${courseIds.map(() => "?").join(",")})`)}`,
      orderBy: [desc(enrollments.createdAt)],
      limit: 10,
      with: {
        user: {
          columns: { id: true, name: true, email: true },
        },
        course: {
          columns: { id: true, title: true },
        },
      },
    });

    return {
      totalCourses: instructorCourses.length,
      totalStudents,
      totalRevenue: 0, // TODO: Calculate from payments when payment system is implemented
      avgCompletionRate,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        studentName: (activity.user as any)?.name || (activity.user as any)?.email,
        courseName: (activity.course as any)?.title,
        enrolledAt: activity.createdAt,
        progress: activity.progress,
        status: activity.status,
      })),
    };
  }),

  /**
   * Get admin platform analytics
   * Returns platform-wide statistics
   */
  getAdminDashboard: protectedProcedure.query(async ({ ctx }) => {
    // Admin only
    if (ctx.session.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    // Get total users
    const totalUsersResult = await ctx.db.select({ count: count() }).from(users);

    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get total institutions
    const totalInstitutionsResult = await ctx.db.select({ count: count() }).from(institutions);

    const totalInstitutions = totalInstitutionsResult[0]?.count || 0;

    // Get total courses
    const totalCoursesResult = await ctx.db.select({ count: count() }).from(courses);

    const totalCourses = totalCoursesResult[0]?.count || 0;

    // Get total enrollments
    const totalEnrollmentsResult = await ctx.db.select({ count: count() }).from(enrollments);

    const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;

    // Get active enrollments
    const activeEnrollmentsResult = await ctx.db
      .select({ count: count() })
      .from(enrollments)
      .where(eq(enrollments.status, "active"));

    const activeEnrollments = activeEnrollmentsResult[0]?.count || 0;

    // Get completed enrollments
    const completedEnrollmentsResult = await ctx.db
      .select({ count: count() })
      .from(enrollments)
      .where(eq(enrollments.status, "completed"));

    const completedEnrollments = completedEnrollmentsResult[0]?.count || 0;

    // Get user growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersResult = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const newUsers = newUsersResult[0]?.count || 0;

    // Get course creation growth (last 30 days)
    const newCoursesResult = await ctx.db
      .select({ count: count() })
      .from(courses)
      .where(gte(courses.createdAt, thirtyDaysAgo));

    const newCourses = newCoursesResult[0]?.count || 0;

    // Get enrollment growth (last 30 days)
    const newEnrollmentsResult = await ctx.db
      .select({ count: count() })
      .from(enrollments)
      .where(gte(enrollments.createdAt, thirtyDaysAgo));

    const newEnrollments = newEnrollmentsResult[0]?.count || 0;

    return {
      platformStats: {
        totalUsers,
        totalInstitutions,
        totalCourses,
        totalEnrollments,
      },
      enrollmentStats: {
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRate:
          totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      },
      growthStats: {
        newUsers,
        newCourses,
        newEnrollments,
      },
    };
  }),

  /**
   * Get student progress report
   * Returns detailed progress for a specific student in a course
   */
  getStudentProgressReport: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: eq(enrollments.id, input.enrollmentId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          course: {
            columns: { id: true, title: true },
            with: {
              modules: {
                with: {
                  lessons: true,
                },
              },
            },
          },
        },
      });

      if (!enrollment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
      }

      // Permission check: student viewing own report, or instructor/admin
      const isOwnReport = ctx.session.userId === enrollment.userId;
      const isInstructor = ctx.session.userId === ((enrollment.course as any).instructorId || "");
      const isAdmin = ctx.session.role === "admin";

      if (!isOwnReport && !isInstructor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this report",
        });
      }

      // Get lesson progress
      const progress = await ctx.db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.userId, enrollment.userId),
          eq(lessonProgress.courseId, enrollment.courseId)
        ),
        with: {
          lesson: {
            columns: { id: true, title: true, order: true },
          },
        },
      });

      // Get quiz attempts
      const courseQuizzes = await ctx.db.query.quizzes.findMany({
        where: eq(quizzes.courseId, enrollment.courseId),
      });

      const quizAttemptsList = await ctx.db.query.quizAttempts.findMany({
        where: and(
          eq(quizAttempts.userId, enrollment.userId),
          sql`${quizAttempts.quizId} IN ${sql.raw(`(${courseQuizzes.map(() => "?").join(",")})`)}`
        ),
        with: {
          quiz: {
            columns: { id: true, title: true },
          },
        },
      });

      // Get assignment submissions
      const courseAssignments = await ctx.db.query.assignments.findMany({
        where: eq(assignments.courseId, enrollment.courseId),
      });

      const submissionsList = await ctx.db.query.assignmentSubmissions.findMany({
        where: and(
          eq(assignmentSubmissions.userId, enrollment.userId),
          sql`${assignmentSubmissions.assignmentId} IN ${sql.raw(`(${courseAssignments.map(() => "?").join(",")})`)}`
        ),
        with: {
          assignment: {
            columns: { id: true, title: true },
          },
        },
      });

      return {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.createdAt,
          completedAt: enrollment.completedAt,
          certificateIssued: enrollment.certificateIssued,
        },
        student: {
          id: (enrollment.user as any).id,
          name: (enrollment.user as any).name,
          email: (enrollment.user as any).email,
        },
        course: {
          id: (enrollment.course as any).id,
          title: (enrollment.course as any).title,
        },
        lessonProgress: progress.map((p) => ({
          lessonId: p.lessonId,
          lessonTitle: (p.lesson as any).title,
          status: p.status,
          completedAt: p.completedAt,
          timeSpent: p.timeSpent,
        })),
        quizAttempts: quizAttemptsList.map((attempt) => ({
          quizId: attempt.quizId,
          quizTitle: (attempt.quiz as any).title,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          maxScore: attempt.maxScore,
          completedAt: attempt.completedAt,
        })),
        assignmentSubmissions: submissionsList.map((submission) => ({
          assignmentId: submission.assignmentId,
          assignmentTitle: (submission.assignment as any).title,
          submittedAt: submission.submittedAt,
          grade: submission.grade,
          score: submission.score,
          maxScore: submission.maxScore,
          status: submission.status,
        })),
      };
    }),

  /**
   * Get course student list with progress
   * Returns all students enrolled in a course with their progress
   */
  getCourseStudentList: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        status: z.enum(["all", "active", "completed", "dropped"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { courseId, status } = input;

      // Verify instructor access
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const isInstructor = ctx.session.userId === (course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      if (!isInstructor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view student list",
        });
      }

      // Build status filter
      const statusFilter = status !== "all" ? eq(enrollments.status, status) : undefined;

      // Get enrollments with student info
      const studentList = await ctx.db.query.enrollments.findMany({
        where: and(eq(enrollments.courseId, courseId), statusFilter),
        orderBy: [desc(enrollments.createdAt)],
        with: {
          user: {
            columns: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return studentList.map((enrollment) => ({
        enrollmentId: enrollment.id,
        student: {
          id: (enrollment.user as any).id,
          name: (enrollment.user as any).name,
          email: (enrollment.user as any).email,
          avatar: (enrollment.user as any).avatar,
        },
        progress: enrollment.progress,
        status: enrollment.status,
        enrolledAt: enrollment.createdAt,
        completedAt: enrollment.completedAt,
        lastAccessedAt: enrollment.lastAccessedAt,
        certificateIssued: enrollment.certificateIssued,
      }));
    }),
});

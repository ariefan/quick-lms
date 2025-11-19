/**
 * Discussion Router
 *
 * Handles course discussions and forums:
 * - Discussion thread creation and management
 * - Nested replies
 * - Pin/close discussions
 * - View tracking
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { discussions, discussionReplies } from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const discussionRouter = createTRPCRouter({
  /**
   * Create a new discussion thread
   */
  createDiscussion: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string().optional(),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { courseId, lessonId, title, content } = input;

      // Get course details
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Check if user is enrolled in the course
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: and(
          eq(ctx.db.schema.enrollments.userId, ctx.session.userId),
          eq(ctx.db.schema.enrollments.courseId, courseId),
          eq(ctx.db.schema.enrollments.status, "active")
        ),
      });

      if (!enrollment && ctx.session.userId !== course.instructorId && ctx.session.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be enrolled in this course to create discussions",
        });
      }

      // Create discussion
      const discussion = await ctx.db
        .insert(discussions)
        .values({
          courseId,
          lessonId,
          title,
          content,
          userId: ctx.session.userId,
          institutionId: course.institutionId,
        })
        .returning();

      return discussion[0];
    }),

  /**
   * Get all discussions for a course
   */
  getCourseDiscussions: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        lessonId: z.string().optional(),
        includeResolved: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { courseId, lessonId, includeResolved } = input;

      // Check course access
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const courseDiscussions = await ctx.db.query.discussions.findMany({
        where: lessonId
          ? and(
              eq(discussions.courseId, courseId),
              eq(discussions.lessonId, lessonId),
              includeResolved ? undefined : eq(discussions.isResolved, false)
            )
          : and(
              eq(discussions.courseId, courseId),
              includeResolved ? undefined : eq(discussions.isResolved, false)
            ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          lastReplyByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(discussions.isPinned), desc(discussions.lastReplyAt), desc(discussions.createdAt)],
      });

      return courseDiscussions;
    }),

  /**
   * Get a single discussion with all replies
   */
  getDiscussionById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, input.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: true,
          lesson: true,
          replies: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [sql`${discussionReplies.createdAt} ASC`],
          },
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Increment view count
      await ctx.db
        .update(discussions)
        .set({
          viewCount: sql`${discussions.viewCount} + 1`,
        })
        .where(eq(discussions.id, input.id));

      return discussion;
    }),

  /**
   * Create a reply to a discussion
   */
  createReply: protectedProcedure
    .input(
      z.object({
        discussionId: z.string(),
        parentReplyId: z.string().optional(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { discussionId, parentReplyId, content } = input;

      // Get discussion
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, discussionId),
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Check if discussion is closed
      if (discussion.isClosed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reply to a closed discussion",
        });
      }

      // Create reply
      const reply = await ctx.db
        .insert(discussionReplies)
        .values({
          discussionId,
          parentReplyId,
          content,
          userId: ctx.session.userId,
        })
        .returning();

      // Update discussion stats
      await ctx.db
        .update(discussions)
        .set({
          replyCount: sql`${discussions.replyCount} + 1`,
          lastReplyAt: new Date(),
          lastReplyBy: ctx.session.userId,
        })
        .where(eq(discussions.id, discussionId));

      return reply[0];
    }),

  /**
   * Update a discussion (owner, instructor, or admin)
   */
  updateDiscussion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, title, content } = input;

      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, id),
        with: {
          course: true,
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === discussion.userId;
      const isInstructor = ctx.session.userId === discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this discussion",
        });
      }

      const updated = await ctx.db
        .update(discussions)
        .set({
          title,
          content,
          updatedAt: new Date(),
        })
        .where(eq(discussions.id, id))
        .returning();

      return updated[0];
    }),

  /**
   * Pin or unpin a discussion (instructor or admin)
   */
  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, input.id),
        with: {
          course: true,
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Permission check: course instructor, institution admin, or platform admin
      const isInstructor = ctx.session.userId === discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to pin discussions",
        });
      }

      const updated = await ctx.db
        .update(discussions)
        .set({
          isPinned: !discussion.isPinned,
          updatedAt: new Date(),
        })
        .where(eq(discussions.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Close or reopen a discussion (instructor or admin)
   */
  toggleClose: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, input.id),
        with: {
          course: true,
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Permission check: course instructor, institution admin, or platform admin
      const isInstructor = ctx.session.userId === discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to close discussions",
        });
      }

      const updated = await ctx.db
        .update(discussions)
        .set({
          isClosed: !discussion.isClosed,
          updatedAt: new Date(),
        })
        .where(eq(discussions.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Mark discussion as resolved (instructor or admin)
   */
  toggleResolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, input.id),
        with: {
          course: true,
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Permission check: course instructor, institution admin, or platform admin
      const isInstructor = ctx.session.userId === discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to mark discussions as resolved",
        });
      }

      const updated = await ctx.db
        .update(discussions)
        .set({
          isResolved: !discussion.isResolved,
          updatedAt: new Date(),
        })
        .where(eq(discussions.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Delete a discussion (owner, instructor, or admin)
   */
  deleteDiscussion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discussion = await ctx.db.query.discussions.findFirst({
        where: eq(discussions.id, input.id),
        with: {
          course: true,
        },
      });

      if (!discussion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discussion not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === discussion.userId;
      const isInstructor = ctx.session.userId === discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this discussion",
        });
      }

      await ctx.db.delete(discussions).where(eq(discussions.id, input.id));

      return { success: true };
    }),

  /**
   * Update a reply (owner, instructor, or admin)
   */
  updateReply: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, content } = input;

      const reply = await ctx.db.query.discussionReplies.findFirst({
        where: eq(discussionReplies.id, id),
        with: {
          discussion: {
            with: {
              course: true,
            },
          },
        },
      });

      if (!reply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reply not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === reply.userId;
      const isInstructor = ctx.session.userId === reply.discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, reply.discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this reply",
        });
      }

      const updated = await ctx.db
        .update(discussionReplies)
        .set({
          content,
          updatedAt: new Date(),
        })
        .where(eq(discussionReplies.id, id))
        .returning();

      return updated[0];
    }),

  /**
   * Delete a reply (owner, instructor, or admin)
   */
  deleteReply: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reply = await ctx.db.query.discussionReplies.findFirst({
        where: eq(discussionReplies.id, input.id),
        with: {
          discussion: {
            with: {
              course: true,
            },
          },
        },
      });

      if (!reply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reply not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === reply.userId;
      const isInstructor = ctx.session.userId === reply.discussion.course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, reply.discussion.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this reply",
        });
      }

      // Mark as deleted instead of hard delete (to preserve thread structure)
      const updated = await ctx.db
        .update(discussionReplies)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          content: "[This reply has been deleted]",
        })
        .where(eq(discussionReplies.id, input.id))
        .returning();

      // Decrement reply count
      await ctx.db
        .update(discussions)
        .set({
          replyCount: sql`${discussions.replyCount} - 1`,
        })
        .where(eq(discussions.id, reply.discussionId));

      return updated[0];
    }),
});

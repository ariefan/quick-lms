/**
 * Announcement Router
 *
 * Handles course announcements from instructors:
 * - Announcement creation and management
 * - Publishing and unpublishing
 * - Priority and pinning
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { announcements } from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const announcementRouter = createTRPCRouter({
  /**
   * Create a new announcement (instructor/admin only)
   */
  createAnnouncement: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        publishNow: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { courseId, title, content, priority, publishNow } = input;

      // Get course
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Permission check: course instructor, institution admin, or platform admin
      const isInstructor = ctx.session.userId === course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, course.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to create announcements for this course",
        });
      }

      // Create announcement
      const announcement = await ctx.db
        .insert(announcements)
        .values({
          courseId,
          title,
          content,
          priority,
          userId: ctx.session.userId,
          institutionId: course.institutionId,
          isPublished: publishNow,
          publishedAt: publishNow ? new Date() : null,
        })
        .returning();

      return announcement[0];
    }),

  /**
   * Get all announcements for a course
   */
  getCourseAnnouncements: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        includeDrafts: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { courseId, includeDrafts } = input;

      // Get course
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Check if user is instructor/admin to see drafts
      const isInstructor = ctx.session.userId === course.instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, course.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      const canSeeDrafts = (isInstructor || isInstitutionAdmin || isAdmin) && includeDrafts;

      const courseAnnouncements = await ctx.db.query.announcements.findMany({
        where: canSeeDrafts
          ? eq(announcements.courseId, courseId)
          : and(eq(announcements.courseId, courseId), eq(announcements.isPublished, true)),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(announcements.isPinned), desc(announcements.publishedAt)],
      });

      return courseAnnouncements;
    }),

  /**
   * Get a single announcement by ID
   */
  getAnnouncementById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, input.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // If not published, check permissions
      if (!announcement.isPublished) {
        const isOwner = ctx.session.userId === announcement.userId;
        const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
        const isAdmin = ctx.session.role === "admin";

        let isInstitutionAdmin = false;
        if (!isOwner && !isInstructor && !isAdmin) {
          const membership = await ctx.db.query.institutionMembers.findFirst({
            where: and(
              eq(institutionMembers.userId, ctx.session.userId),
              eq(institutionMembers.institutionId, announcement.institutionId),
              eq(institutionMembers.role, "admin")
            ),
          });
          isInstitutionAdmin = !!membership;
        }

        if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to view this announcement",
          });
        }
      }

      return announcement;
    }),

  /**
   * Update an announcement (instructor/admin only)
   */
  updateAnnouncement: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, title, content, priority } = input;

      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, id),
        with: {
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === announcement.userId;
      const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, announcement.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this announcement",
        });
      }

      const updated = await ctx.db
        .update(announcements)
        .set({
          title,
          content,
          priority,
          updatedAt: new Date(),
        })
        .where(eq(announcements.id, id))
        .returning();

      return updated[0];
    }),

  /**
   * Publish an announcement (instructor/admin only)
   */
  publishAnnouncement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, input.id),
        with: {
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === announcement.userId;
      const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, announcement.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to publish this announcement",
        });
      }

      const updated = await ctx.db
        .update(announcements)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(announcements.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Unpublish an announcement (instructor/admin only)
   */
  unpublishAnnouncement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, input.id),
        with: {
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // Permission check
      const isOwner = ctx.session.userId === announcement.userId;
      const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, announcement.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to unpublish this announcement",
        });
      }

      const updated = await ctx.db
        .update(announcements)
        .set({
          isPublished: false,
          updatedAt: new Date(),
        })
        .where(eq(announcements.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Toggle pin status (instructor/admin only)
   */
  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, input.id),
        with: {
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // Permission check: course instructor, institution admin, or platform admin
      const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, announcement.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to pin announcements",
        });
      }

      const updated = await ctx.db
        .update(announcements)
        .set({
          isPinned: !announcement.isPinned,
          updatedAt: new Date(),
        })
        .where(eq(announcements.id, input.id))
        .returning();

      return updated[0];
    }),

  /**
   * Delete an announcement (instructor/admin only)
   */
  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.query.announcements.findFirst({
        where: eq(announcements.id, input.id),
        with: {
          course: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found",
        });
      }

      // Permission check: owner, course instructor, institution admin, or platform admin
      const isOwner = ctx.session.userId === announcement.userId;
      const isInstructor = ctx.session.userId === (announcement.course as any).instructorId;
      const isAdmin = ctx.session.role === "admin";

      let isInstitutionAdmin = false;
      if (!isOwner && !isInstructor && !isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, announcement.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isOwner && !isInstructor && !isInstitutionAdmin && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this announcement",
        });
      }

      await ctx.db.delete(announcements).where(eq(announcements.id, input.id));

      return { success: true };
    }),
});

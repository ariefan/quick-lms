/**
 * Notification tRPC Router
 *
 * Handles in-app notifications:
 * - Create notifications
 * - Get user notifications
 * - Mark as read/unread
 * - Delete notifications
 */

import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { notifications } from "../db/schema/lms";

export const notificationRouter = createTRPCRouter({
  /**
   * Create a new notification
   */
  createNotification: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum([
          "announcement",
          "discussion_reply",
          "assignment_graded",
          "quiz_graded",
          "course_enrollment",
          "certificate_issued",
          "coupon_created",
          "system",
        ]),
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(1000),
        courseId: z.string().optional(),
        relatedId: z.string().optional(),
        relatedType: z.string().optional(),
        actionUrl: z.string().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can create notifications for other users
      // Or users can create notifications for themselves (system-generated)
      const isAdmin = ctx.session.role === "admin";
      const isSelf = ctx.session.userId === input.userId;

      if (!isAdmin && !isSelf) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to create notifications for other users",
        });
      }

      const notification = await ctx.db
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          courseId: input.courseId,
          relatedId: input.relatedId,
          relatedType: input.relatedType,
          actionUrl: input.actionUrl,
          priority: input.priority,
        })
        .returning();

      return notification[0];
    }),

  /**
   * Get user's notifications with pagination and filtering
   */
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
        type: z
          .enum([
            "announcement",
            "discussion_reply",
            "assignment_graded",
            "quiz_graded",
            "course_enrollment",
            "certificate_issued",
            "coupon_created",
            "system",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.session.userId)];

      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      if (input.type) {
        conditions.push(eq(notifications.type, input.type));
      }

      const items = await ctx.db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          course: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Get total count
      const totalResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions));

      const total = Number(totalResult[0]?.count ?? 0);

      return {
        items,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get count of unread notifications
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.session.userId), eq(notifications.isRead, false)));

    return Number(result[0]?.count ?? 0);
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const notification = await ctx.db.query.notifications.findFirst({
        where: eq(notifications.id, input.notificationId),
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      if (notification.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this notification",
        });
      }

      const updated = await ctx.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, input.notificationId))
        .returning();

      return updated[0];
    }),

  /**
   * Mark notification as unread
   */
  markAsUnread: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const notification = await ctx.db.query.notifications.findFirst({
        where: eq(notifications.id, input.notificationId),
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      if (notification.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this notification",
        });
      }

      const updated = await ctx.db
        .update(notifications)
        .set({
          isRead: false,
          readAt: null,
        })
        .where(eq(notifications.id, input.notificationId))
        .returning();

      return updated[0];
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(notifications.userId, ctx.session.userId), eq(notifications.isRead, false)));

    return { success: true };
  }),

  /**
   * Delete notification
   */
  deleteNotification: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const notification = await ctx.db.query.notifications.findFirst({
        where: eq(notifications.id, input.notificationId),
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      if (notification.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this notification",
        });
      }

      await ctx.db.delete(notifications).where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  /**
   * Delete all read notifications
   */
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(notifications)
      .where(and(eq(notifications.userId, ctx.session.userId), eq(notifications.isRead, true)));

    return { success: true };
  }),

  /**
   * Get notification by ID
   */
  getNotificationById: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const notification = await ctx.db.query.notifications.findFirst({
        where: eq(notifications.id, input.notificationId),
        with: {
          course: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      if (notification.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this notification",
        });
      }

      return notification;
    }),
});

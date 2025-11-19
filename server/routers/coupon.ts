/**
 * Coupon Router
 *
 * Handles discount coupons:
 * - Coupon CRUD operations
 * - Coupon validation
 * - Apply coupon to enrollment
 * - Usage tracking
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { coupons, couponUsages, enrollments } from "../db/schema/lms";
import { courses } from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const couponRouter = createTRPCRouter({
  /**
   * Create a new coupon
   * Admin, institution admin, or course instructor can create
   */
  createCoupon: protectedProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50).toUpperCase(),
        description: z.string().optional(),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().int().min(1),
        maxDiscount: z.number().int().optional(),
        courseId: z.string().optional(), // null = platform-wide
        institutionId: z.string(),
        maxUses: z.number().int().optional(),
        maxUsesPerUser: z.number().int().default(1),
        startsAt: z.date().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Permission check
      const isAdmin = ctx.session.role === "admin";

      // Check if institution admin
      let isInstitutionAdmin = false;
      if (!isAdmin) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, input.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      // Check if course instructor (if courseId provided)
      let isCourseInstructor = false;
      if (!isAdmin && !isInstitutionAdmin && input.courseId) {
        const course = await ctx.db.query.courses.findFirst({
          where: eq(courses.id, input.courseId),
        });

        if (course) {
          isCourseInstructor = ctx.session.userId === (course as any).instructorId;
        }
      }

      if (!isAdmin && !isInstitutionAdmin && !isCourseInstructor) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to create coupons",
        });
      }

      // Validate discount value
      if (input.discountType === "percentage" && input.discountValue > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage discount cannot exceed 100%",
        });
      }

      // Check if code already exists
      const existing = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.code, input.code),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Coupon code already exists",
        });
      }

      // Create coupon
      const coupon = await ctx.db
        .insert(coupons)
        .values({
          ...input,
          createdBy: ctx.session.userId,
        })
        .returning();

      return coupon[0];
    }),

  /**
   * Get coupons for a course or institution
   */
  getCoupons: protectedProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        institutionId: z.string().optional(),
        includeExpired: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { courseId, institutionId, includeExpired } = input;

      // Build where clause
      const conditions: any[] = [];

      if (courseId) {
        conditions.push(eq(coupons.courseId, courseId));
      }

      if (institutionId) {
        conditions.push(eq(coupons.institutionId, institutionId));
      }

      // Filter out expired coupons if requested
      if (!includeExpired) {
        const now = new Date();
        conditions.push(
          sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} > ${now.getTime()})`
        );
      }

      const couponsList = await ctx.db.query.coupons.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(coupons.createdAt)],
        with: {
          course: {
            columns: { id: true, title: true },
          },
          creator: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      return couponsList;
    }),

  /**
   * Get coupon by ID with usage stats
   */
  getCouponById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
        with: {
          course: {
            columns: { id: true, title: true },
          },
          institution: {
            columns: { id: true, name: true },
          },
          creator: {
            columns: { id: true, name: true, email: true },
          },
          usages: {
            with: {
              user: {
                columns: { id: true, name: true, email: true },
              },
            },
            orderBy: [desc(couponUsages.usedAt)],
          },
        },
      });

      if (!coupon) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found" });
      }

      return coupon;
    }),

  /**
   * Validate a coupon code
   * Public validation for enrollment flow
   */
  validateCoupon: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        courseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { code, courseId } = input;

      // Find coupon
      const coupon = await ctx.db.query.coupons.findFirst({
        where: and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)),
        with: {
          course: true,
        },
      });

      if (!coupon) {
        return {
          valid: false,
          message: "Invalid coupon code",
        };
      }

      // Check if coupon is for this course or platform-wide
      if (coupon.courseId && coupon.courseId !== courseId) {
        return {
          valid: false,
          message: "This coupon is not valid for this course",
        };
      }

      // Check expiration
      const now = new Date();
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return {
          valid: false,
          message: "This coupon is not yet valid",
        };
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return {
          valid: false,
          message: "This coupon has expired",
        };
      }

      // Check max uses
      if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
        return {
          valid: false,
          message: "This coupon has reached its usage limit",
        };
      }

      // Check user usage
      const userUsageCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(couponUsages)
        .where(
          and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, ctx.session.userId))
        );

      const userUsage = Number(userUsageCount[0]?.count || 0);

      if (userUsage >= coupon.maxUsesPerUser) {
        return {
          valid: false,
          message: "You have already used this coupon the maximum number of times",
        };
      }

      // Get course to calculate discount
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        return {
          valid: false,
          message: "Course not found",
        };
      }

      // Calculate discount
      const priceInCents = Math.round(parseFloat(course.price) * 100);
      let discountAmount = 0;

      if (coupon.discountType === "percentage") {
        discountAmount = Math.round((priceInCents * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      const finalPrice = Math.max(0, priceInCents - discountAmount);

      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        pricing: {
          originalPrice: priceInCents,
          discountAmount,
          finalPrice,
        },
      };
    }),

  /**
   * Apply coupon to enrollment
   * Should be called during enrollment process
   */
  applyCoupon: protectedProcedure
    .input(
      z.object({
        couponCode: z.string(),
        courseId: z.string(),
        enrollmentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { couponCode, courseId, enrollmentId } = input;

      // Find and validate coupon
      const coupon = await ctx.db.query.coupons.findFirst({
        where: and(eq(coupons.code, couponCode.toUpperCase()), eq(coupons.isActive, true)),
      });

      if (!coupon) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid coupon code",
        });
      }

      // Check if coupon is for this course or platform-wide
      if (coupon.courseId && coupon.courseId !== courseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon is not valid for this course",
        });
      }

      // Check expiration
      const now = new Date();
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon is not yet valid",
        });
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon has expired",
        });
      }

      // Check max uses
      if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon has reached its usage limit",
        });
      }

      // Check user usage
      const userUsageCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(couponUsages)
        .where(
          and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, ctx.session.userId))
        );

      const userUsage = Number(userUsageCount[0]?.count || 0);

      if (userUsage >= coupon.maxUsesPerUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already used this coupon the maximum number of times",
        });
      }

      // Get course to calculate discount
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Calculate discount
      const priceInCents = Math.round(parseFloat(course.price) * 100);
      let discountAmount = 0;

      if (coupon.discountType === "percentage") {
        discountAmount = Math.round((priceInCents * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      const finalPrice = Math.max(0, priceInCents - discountAmount);

      // Get enrollment
      const enrollment = await ctx.db.query.enrollments.findFirst({
        where: eq(enrollments.id, enrollmentId),
      });

      if (!enrollment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
      }

      // Verify enrollment belongs to user
      if (enrollment.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      // Record coupon usage
      await ctx.db.insert(couponUsages).values({
        couponId: coupon.id,
        userId: ctx.session.userId,
        enrollmentId,
        courseId,
        institutionId: enrollment.institutionId,
        discountAmount,
        originalPrice: priceInCents,
        finalPrice,
      });

      // Increment coupon usage count
      await ctx.db
        .update(coupons)
        .set({
          currentUses: sql`${coupons.currentUses} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.id, coupon.id));

      return {
        success: true,
        pricing: {
          originalPrice: priceInCents,
          discountAmount,
          finalPrice,
        },
      };
    }),

  /**
   * Update coupon
   */
  updateCoupon: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().optional(),
        maxUses: z.number().int().optional(),
        maxUsesPerUser: z.number().int().optional(),
        startsAt: z.date().optional(),
        expiresAt: z.date().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, id),
      });

      if (!coupon) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found" });
      }

      // Permission check
      const isAdmin = ctx.session.role === "admin";
      const isCreator = coupon.createdBy === ctx.session.userId;

      let isInstitutionAdmin = false;
      if (!isAdmin && !isCreator) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, coupon.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isAdmin && !isCreator && !isInstitutionAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this coupon",
        });
      }

      const updated = await ctx.db
        .update(coupons)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(coupons.id, id))
        .returning();

      return updated[0];
    }),

  /**
   * Delete coupon
   */
  deleteCoupon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
      });

      if (!coupon) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found" });
      }

      // Permission check
      const isAdmin = ctx.session.role === "admin";
      const isCreator = coupon.createdBy === ctx.session.userId;

      let isInstitutionAdmin = false;
      if (!isAdmin && !isCreator) {
        const membership = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.userId, ctx.session.userId),
            eq(institutionMembers.institutionId, coupon.institutionId),
            eq(institutionMembers.role, "admin")
          ),
        });
        isInstitutionAdmin = !!membership;
      }

      if (!isAdmin && !isCreator && !isInstitutionAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this coupon",
        });
      }

      await ctx.db.delete(coupons).where(eq(coupons.id, input.id));

      return { success: true };
    }),

  /**
   * Get coupon usage statistics
   */
  getCouponStats: protectedProcedure
    .input(z.object({ couponId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.couponId),
      });

      if (!coupon) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found" });
      }

      // Get total usage
      const totalUsages = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(couponUsages)
        .where(eq(couponUsages.couponId, input.couponId));

      const usageCount = Number(totalUsages[0]?.count || 0);

      // Get total discount given
      const discountSum = await ctx.db
        .select({ sum: sql<number>`sum(${couponUsages.discountAmount})` })
        .from(couponUsages)
        .where(eq(couponUsages.couponId, input.couponId));

      const totalDiscount = Number(discountSum[0]?.sum || 0);

      // Get unique users
      const uniqueUsers = await ctx.db
        .select({ count: sql<number>`count(DISTINCT ${couponUsages.userId})` })
        .from(couponUsages)
        .where(eq(couponUsages.couponId, input.couponId));

      const uniqueUserCount = Number(uniqueUsers[0]?.count || 0);

      return {
        couponCode: coupon.code,
        totalUses: usageCount,
        uniqueUsers: uniqueUserCount,
        totalDiscountGiven: totalDiscount,
        remainingUses: coupon.maxUses ? coupon.maxUses - coupon.currentUses : null,
      };
    }),
});

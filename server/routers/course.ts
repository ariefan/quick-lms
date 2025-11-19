/**
 * Course Router
 *
 * Handles courses, categories, subjects, modules, and lessons
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc, asc, isNull } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  categories,
  subjects,
  courses,
  courseModules,
  lessons,
  type Course,
} from "../db/schema/courses";
import { institutionMembers } from "../db/schema/institutions";

/**
 * Helper: Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Helper: Check if user can manage institution content
 */
async function canManageInstitution(
  db: any,
  institutionId: string,
  userId: string
): Promise<boolean> {
  const member = await db.query.institutionMembers.findFirst({
    where: and(
      eq(institutionMembers.institutionId, institutionId),
      eq(institutionMembers.userId, userId),
      eq(institutionMembers.status, "active")
    ),
  });
  return !!member;
}

/**
 * Helper: Check if user can create courses in institution
 */
async function canCreateCourses(db: any, institutionId: string, userId: string): Promise<boolean> {
  const member = await db.query.institutionMembers.findFirst({
    where: and(
      eq(institutionMembers.institutionId, institutionId),
      eq(institutionMembers.userId, userId),
      eq(institutionMembers.canCreateCourses, true),
      eq(institutionMembers.status, "active")
    ),
  });
  return !!member;
}

export const courseRouter = createTRPCRouter({
  // =============================================================================
  // CATEGORIES
  // =============================================================================

  /**
   * Get all categories (global + institution-specific)
   */
  getCategories: publicProcedure
    .input(
      z
        .object({
          institutionId: z.string().optional(),
          includeGlobal: z.boolean().default(true),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.institutionId) {
        if (input.includeGlobal) {
          conditions.push(
            or(eq(categories.institutionId, input.institutionId), isNull(categories.institutionId))
          );
        } else {
          conditions.push(eq(categories.institutionId, input.institutionId));
        }
      } else if (input?.includeGlobal !== false) {
        conditions.push(isNull(categories.institutionId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.query.categories.findMany({
        where,
        orderBy: [asc(categories.displayOrder), asc(categories.name)],
      });
    }),

  /**
   * Create category (admin or institution admin)
   */
  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        image: z.string().optional(),
        color: z.string().optional(),
        parentId: z.string().optional(),
        institutionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (input.institutionId) {
        const canManage = await canManageInstitution(
          ctx.db,
          input.institutionId,
          ctx.session.userId
        );
        if (!canManage) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create categories for this institution",
          });
        }
      }
      // TODO: Check if user is admin for global categories

      const slug = generateSlug(input.name);

      const [category] = await ctx.db
        .insert(categories)
        .values({
          ...input,
          slug,
        })
        .returning();

      return category;
    }),

  // =============================================================================
  // SUBJECTS
  // =============================================================================

  /**
   * Get subjects (filtered by category/institution)
   */
  getSubjects: publicProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          institutionId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.categoryId) {
        conditions.push(eq(subjects.categoryId, input.categoryId));
      }
      if (input?.institutionId) {
        conditions.push(eq(subjects.institutionId, input.institutionId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.query.subjects.findMany({
        where,
        orderBy: [asc(subjects.displayOrder), asc(subjects.name)],
        with: {
          category: true,
        },
      });
    }),

  /**
   * Create subject
   */
  createSubject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        categoryId: z.string().optional(),
        institutionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (input.institutionId) {
        const canManage = await canManageInstitution(
          ctx.db,
          input.institutionId,
          ctx.session.userId
        );
        if (!canManage) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create subjects for this institution",
          });
        }
      }

      const slug = generateSlug(input.name);

      const [subject] = await ctx.db
        .insert(subjects)
        .values({
          ...input,
          slug,
        })
        .returning();

      return subject;
    }),

  // =============================================================================
  // COURSES
  // =============================================================================

  /**
   * Create course
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        thumbnail: z.string().optional(),
        level: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("beginner"),
        price: z.string().default("0.00"),
        categoryId: z.string().optional(),
        subjectId: z.string().optional(),
        institutionId: z.string(),
        language: z.string().default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user can create courses in this institution
      const canCreate = await canCreateCourses(ctx.db, input.institutionId, ctx.session.userId);
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create courses in this institution",
        });
      }

      const slug = generateSlug(input.title);

      const [course] = await ctx.db
        .insert(courses)
        .values({
          ...input,
          slug,
          instructorId: ctx.session.userId,
          status: "draft",
        })
        .returning();

      return course;
    }),

  /**
   * Get course by ID
   */
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const course = await ctx.db.query.courses.findFirst({
      where: eq(courses.id, input.id),
      with: {
        instructor: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        institution: {
          columns: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        category: true,
        subject: true,
        modules: {
          orderBy: [asc(courseModules.displayOrder)],
          with: {
            lessons: {
              orderBy: [asc(lessons.displayOrder)],
            },
          },
        },
      },
    });

    if (!course) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Course not found",
      });
    }

    return course;
  }),

  /**
   * Get courses (with filters)
   */
  getCourses: publicProcedure
    .input(
      z
        .object({
          institutionId: z.string().optional(),
          instructorId: z.string().optional(),
          categoryId: z.string().optional(),
          subjectId: z.string().optional(),
          status: z.enum(["draft", "published", "archived", "under_review"]).optional(),
          level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
          isFeatured: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.institutionId) {
        conditions.push(eq(courses.institutionId, input.institutionId));
      }
      if (input?.instructorId) {
        conditions.push(eq(courses.instructorId, input.instructorId));
      }
      if (input?.categoryId) {
        conditions.push(eq(courses.categoryId, input.categoryId));
      }
      if (input?.subjectId) {
        conditions.push(eq(courses.subjectId, input.subjectId));
      }
      if (input?.status) {
        conditions.push(eq(courses.status, input.status));
      }
      if (input?.level) {
        conditions.push(eq(courses.level, input.level));
      }
      if (input?.isFeatured !== undefined) {
        conditions.push(eq(courses.isFeatured, input.isFeatured));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.query.courses.findMany({
        where,
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        orderBy: [desc(courses.createdAt)],
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
          subject: true,
        },
      });
    }),

  /**
   * Get my courses (as instructor)
   */
  getMyCourses: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.courses.findMany({
      where: eq(courses.instructorId, ctx.session.userId),
      orderBy: [desc(courses.updatedAt)],
      with: {
        institution: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: true,
        subject: true,
      },
    });
  }),

  /**
   * Update course
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        thumbnail: z.string().optional(),
        level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        price: z.string().optional(),
        discountPrice: z.string().optional(),
        categoryId: z.string().optional(),
        subjectId: z.string().optional(),
        language: z.string().optional(),
        tags: z.array(z.string()).optional(),
        prerequisites: z.array(z.string()).optional(),
        learningObjectives: z.array(z.string()).optional(),
        targetAudience: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Get course and check permission
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, id),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Check if user is instructor or can edit all courses
      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, course.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      const canEdit =
        (course as any).instructorId === ctx.session.userId || (member && member.canEditAllCourses);

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this course",
        });
      }

      // Update slug if title changes
      if (updates.title) {
        Object.assign(updates, { slug: generateSlug(updates.title) });
      }

      const [updated] = await ctx.db
        .update(courses)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(courses.id, id))
        .returning();

      return updated;
    }),

  /**
   * Publish course
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.id),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if ((course as any).instructorId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the course instructor can publish",
        });
      }

      const [updated] = await ctx.db
        .update(courses)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(courses.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Unpublish course (back to draft)
   */
  unpublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.id),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if ((course as any).instructorId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the course instructor can unpublish",
        });
      }

      const [updated] = await ctx.db
        .update(courses)
        .set({
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(courses.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete course
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.id),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if ((course as any).instructorId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the course instructor can delete",
        });
      }

      await ctx.db.delete(courses).where(eq(courses.id, input.id));

      return { success: true };
    }),

  // =============================================================================
  // MODULES
  // =============================================================================

  /**
   * Create module
   */
  createModule: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        courseId: z.string(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get course and check permission
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, course.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      const canEdit =
        (course as any).instructorId === ctx.session.userId || (member && member.canEditAllCourses);

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this course",
        });
      }

      const [module] = await ctx.db
        .insert(courseModules)
        .values({
          ...input,
          institutionId: course.institutionId,
        })
        .returning();

      return module;
    }),

  /**
   * Update module
   */
  updateModule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const module = await ctx.db.query.courseModules.findFirst({
        where: eq(courseModules.id, id),
        with: {
          course: true,
        },
      });

      if (!module) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found",
        });
      }

      // Check permission
      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, module.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      const canEdit =
        (module.course as any).instructorId === ctx.session.userId || (member && member.canEditAllCourses);

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this module",
        });
      }

      const [updated] = await ctx.db
        .update(courseModules)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(courseModules.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete module
   */
  deleteModule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const module = await ctx.db.query.courseModules.findFirst({
        where: eq(courseModules.id, input.id),
        with: {
          course: true,
        },
      });

      if (!module) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found",
        });
      }

      if ((module.course as any).instructorId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this module",
        });
      }

      await ctx.db.delete(courseModules).where(eq(courseModules.id, input.id));

      return { success: true };
    }),

  // =============================================================================
  // LESSONS
  // =============================================================================

  /**
   * Create lesson
   */
  createLesson: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        courseId: z.string(),
        moduleId: z.string().optional(),
        content: z
          .object({
            type: z.enum(["text", "video", "audio", "document", "interactive"]),
            text: z.string().optional(),
            url: z.string().optional(),
            duration: z.number().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
        isPreview: z.boolean().default(false),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get course and check permission
      const course = await ctx.db.query.courses.findFirst({
        where: eq(courses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, course.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      const canEdit =
        (course as any).instructorId === ctx.session.userId || (member && member.canEditAllCourses);

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this course",
        });
      }

      const slug = generateSlug(input.title);

      const [lesson] = await ctx.db
        .insert(lessons)
        .values({
          ...input,
          slug,
          institutionId: course.institutionId,
        })
        .returning();

      return lesson;
    }),

  /**
   * Update lesson
   */
  updateLesson: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        content: z
          .object({
            type: z.enum(["text", "video", "audio", "document", "interactive"]),
            text: z.string().optional(),
            url: z.string().optional(),
            duration: z.number().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
        isPreview: z.boolean().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const lesson = await ctx.db.query.lessons.findFirst({
        where: eq(lessons.id, id),
        with: {
          course: true,
        },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      // Check permission
      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, lesson.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      const canEdit =
        (lesson.course as any).instructorId === ctx.session.userId || (member && member.canEditAllCourses);

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this lesson",
        });
      }

      // Update slug if title changes
      if (updates.title) {
        Object.assign(updates, { slug: generateSlug(updates.title) });
      }

      const [updated] = await ctx.db
        .update(lessons)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(lessons.id, id))
        .returning();

      return updated;
    }),

  /**
   * Delete lesson
   */
  deleteLesson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.query.lessons.findFirst({
        where: eq(lessons.id, input.id),
        with: {
          course: true,
        },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      if ((lesson.course as any).instructorId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this lesson",
        });
      }

      await ctx.db.delete(lessons).where(eq(lessons.id, input.id));

      return { success: true };
    }),
});

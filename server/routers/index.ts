/**
 * tRPC App Router
 *
 * Main router that combines all feature routers
 * This is the single source of truth for the API contract
 *
 * Usage in client:
 * - trpc.user.getAll.useQuery()
 * - trpc.user.create.useMutation()
 *
 * @see https://trpc.io/docs/server/routers
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { users, insertUserSchema } from "../db/schema";
import { eq } from "drizzle-orm";
import { authRouter } from "./auth";
import { uploadRouter } from "./upload";
import { institutionRouter } from "./institution";
import { courseRouter } from "./course";
import { studentRouter } from "./student";
import { quizRouter } from "./quiz";
import { assignmentRouter } from "./assignment";

/**
 * User router - handles user CRUD operations
 * All operations are type-safe and validated with Zod
 */
const userRouter = createTRPCRouter({
  /** Get all users */
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(users);
  }),

  /** Get a single user by ID */
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const user = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);
    return user[0];
  }),

  /** Create a new user with validation */
  create: publicProcedure
    .input(insertUserSchema.omit({ id: true, createdAt: true, updatedAt: true }))
    .mutation(async ({ ctx, input }) => {
      const userId = crypto.randomUUID();
      const result = await ctx.db
        .insert(users)
        .values({
          ...input,
          id: userId,
        })
        .returning();
      return result[0];
    }),

  /** Delete a user by ID */
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(users).where(eq(users.id, input.id));
    return { success: true };
  }),
});

/**
 * Main app router - combine all feature routers here
 * Export the type for client-side usage
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  upload: uploadRouter,
  institution: institutionRouter,
  course: courseRouter,
  student: studentRouter,
  quiz: quizRouter,
  assignment: assignmentRouter,
});

/**
 * Type definition for the entire API
 * Used by tRPC client for end-to-end type safety
 */
export type AppRouter = typeof appRouter;

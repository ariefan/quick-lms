import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { users, insertUserSchema } from "../db/schema";
import { eq } from "drizzle-orm";

const userRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(users);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);
      return user[0];
    }),

  create: publicProcedure
    .input(insertUserSchema.omit({ id: true, createdAt: true }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(users).values(input).returning();
      return result[0];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});

export const appRouter = createTRPCRouter({
  user: userRouter,
});

export type AppRouter = typeof appRouter;

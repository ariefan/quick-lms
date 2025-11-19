/**
 * tRPC Server Configuration
 *
 * This file sets up the tRPC server with:
 * - Context creation (provides db and session to all procedures)
 * - SuperJSON transformer (for Date, Map, Set serialization)
 * - Reusable router and procedure builders
 * - Authentication middleware
 *
 * @see https://trpc.io/docs/server/context
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "./db";
import { getServerSession } from "@/lib/auth/session";

/**
 * Creates the tRPC context for each request
 * Context is available in all procedures via `ctx`
 */
export const createTRPCContext = async () => {
  const session = await getServerSession();

  return {
    db,
    session,
  };
};

// Initialize tRPC with context type and transformer
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

/**
 * Reusable router builder
 * @example
 * const myRouter = createTRPCRouter({
 *   getPosts: publicProcedure.query(() => [...])
 * })
 */
export const createTRPCRouter = t.router;

/**
 * Public procedure - available to all clients
 * @example
 * publicProcedure
 *   .input(z.object({ id: z.number() }))
 *   .query(({ input, ctx }) => ctx.db.query.users.findFirst())
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 * Throws UNAUTHORIZED error if user is not logged in
 * @example
 * protectedProcedure
 *   .input(z.object({ id: z.number() }))
 *   .query(({ input, ctx }) => {
 *     // ctx.session.userId is guaranteed to exist
 *     return ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.userId) })
 *   })
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session, // Session is guaranteed to exist here
    },
  });
});

/**
 * tRPC Server Configuration
 *
 * This file sets up the tRPC server with:
 * - Context creation (provides db to all procedures)
 * - SuperJSON transformer (for Date, Map, Set serialization)
 * - Reusable router and procedure builders
 *
 * @see https://trpc.io/docs/server/context
 */

import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { db } from "./db";

/**
 * Creates the tRPC context for each request
 * Context is available in all procedures via `ctx`
 */
export const createTRPCContext = async () => {
  return {
    db,
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

/**
 * Server exports - Backend code (server-side only)
 *
 * Usage:
 * - Import from @/server for server-side code
 * - Never import in client components
 */

export { db } from "./db";
export * from "./db/schema";
export { appRouter, type AppRouter } from "./routers";
export { createTRPCContext, createTRPCRouter, publicProcedure } from "./trpc";

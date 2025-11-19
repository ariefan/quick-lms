import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { db } from "./db";

// Create context for tRPC
export const createTRPCContext = async () => {
  return {
    db,
  };
};

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * tRPC React Client
 *
 * Type-safe React hooks for making API calls
 * All procedures from the server are available with full autocomplete
 *
 * Usage in client components:
 * @example
 * "use client";
 * import { trpc } from "@/lib/trpc/client";
 *
 * function MyComponent() {
 *   const { data, isLoading } = trpc.user.getAll.useQuery();
 *   const createUser = trpc.user.create.useMutation();
 *
 *   return <div>...</div>;
 * }
 *
 * @see https://trpc.io/docs/client/react
 */

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers";

/**
 * tRPC React hooks - use in client components only
 * Provides type-safe queries and mutations
 */
export const trpc = createTRPCReact<AppRouter>();

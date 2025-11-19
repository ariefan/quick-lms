/**
 * Authentication tRPC Router
 *
 * Handles user authentication:
 * - Register new users
 * - Login with email/password
 * - Get current session
 * - Logout
 */

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, clearSessionCookie, getServerSession } from "@/lib/auth/session";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  users,
  registerSchema,
  loginSchema,
  publicUserSchema,
  type PublicUser,
} from "../db/schema/auth";

export const authRouter = createTRPCRouter({
  /**
   * Register a new user
   */
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const userId = crypto.randomUUID();
    const newUser = await ctx.db
      .insert(users)
      .values({
        id: userId,
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: "user",
        isActive: true,
        emailVerified: true, // Auto-verify for simple auth
      })
      .returning();

    const user = newUser[0];

    // Create session
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Return user without password
    return publicUserSchema.parse(user);
  }),

  /**
   * Login with email and password
   */
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    // Find user by email
    const userResult = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (userResult.length === 0) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const user = userResult[0];

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password);

    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Account is deactivated",
      });
    }

    // Create session
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Return user without password
    return publicUserSchema.parse(user);
  }),

  /**
   * Get current session
   */
  getSession: publicProcedure.query(async (): Promise<PublicUser | null> => {
    const session = await getServerSession();

    if (!session) {
      return null;
    }

    // Return session data as public user format
    return {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      avatar: null,
      bio: null,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),

  /**
   * Logout (clear session)
   */
  logout: publicProcedure.mutation(async () => {
    await clearSessionCookie();
    return { success: true };
  }),
});

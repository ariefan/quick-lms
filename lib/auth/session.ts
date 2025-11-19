/**
 * Session Management Utilities
 *
 * Functions for creating and verifying JWT session tokens
 */

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// JWT secret - in production, use a strong secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expires in 7 days
const COOKIE_NAME = "session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "user" | "instructor" | "admin";
}

/**
 * Create a JWT session token
 * @param data - Session data to encode in the token
 * @returns JWT token string
 */
export function createSessionToken(data: SessionData): string {
  return jwt.sign(data, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT session token
 * @param token - JWT token to verify
 * @returns Decoded session data or null if invalid
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionData;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current session from cookies (server-side only)
 * @returns Session data or null if no valid session
 */
export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Set session cookie (use in API routes)
 * @param data - Session data to store
 */
export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = createSessionToken(data);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
} as const;

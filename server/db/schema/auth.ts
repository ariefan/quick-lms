/**
 * Authentication & User Management Schema
 *
 * Handles user accounts, roles, and authentication
 * Roles: user (default), instructor, admin
 * Institution access is managed separately in institutions schema
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Users table - stores all user accounts
 * Default role is "user" - everyone can browse courses
 * Instructors are users with institution access
 * Admins can approve institutions
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Compatible with auth providers
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),

  // Role-based access
  role: text("role", { enum: ["user", "instructor", "admin"] })
    .default("user")
    .notNull(),

  // Account status
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_role_idx").on(table.role),
]);

/**
 * User profiles - extended user information
 */
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Contact information
  phone: text("phone"),
  website: text("website"),
  location: text("location"),

  // Social links
  socialLinks: text("social_links", { mode: "json" }).$type<{
    linkedin?: string;
    twitter?: string;
    github?: string;
    youtube?: string;
  }>(),

  // Preferences
  timezone: text("timezone").default("UTC"),
  language: text("language").default("en"),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("user_profiles_user_idx").on(table.userId),
]);

// Zod schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["user", "instructor", "admin"]).default("user"),
});

export const selectUserSchema = createSelectSchema(users);

export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const selectUserProfileSchema = createSelectSchema(userProfiles);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

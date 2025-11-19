/**
 * Database Schema
 *
 * Defines all database tables using Drizzle ORM
 * Automatically generates Zod schemas for validation
 *
 * Pattern:
 * 1. Define table with drizzle schema
 * 2. Create Zod schemas with createInsertSchema/createSelectSchema
 * 3. Export types for TypeScript
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 * @see https://orm.drizzle.team/docs/zod
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Users table - stores application users
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

/**
 * Zod schema for inserting users
 * Auto-generated from Drizzle schema with custom refinements
 */
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1),
});

/**
 * Zod schema for selecting users
 * Auto-generated from Drizzle schema
 */
export const selectUserSchema = createSelectSchema(users);

/**
 * TypeScript types inferred from Drizzle schema
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

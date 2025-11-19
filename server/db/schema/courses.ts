/**
 * Courses Schema
 *
 * Course catalog, structure, and content
 * - All courses are scoped to institutions
 * - Categories and subjects can be global or institution-specific
 * - Course structure: Course -> Modules -> Lessons
 */

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";
import { institutions } from "./institutions";

// =============================================================================
// CATEGORIES & SUBJECTS
// =============================================================================

/**
 * Categories - top-level course organization
 * Can be global (institutionId = null) or institution-specific
 */
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  color: text("color"),

  displayOrder: integer("display_order").default(0).notNull(),
  parentId: text("parent_id"), // Self-reference for subcategories

  // null = global category, otherwise institution-specific
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),

  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("categories_slug_idx").on(table.slug),
  index("categories_institution_idx").on(table.institutionId),
  index("categories_parent_idx").on(table.parentId),
]);

/**
 * Subjects - specific topics within categories
 */
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  color: text("color"),

  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),

  displayOrder: integer("display_order").default(0).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("subjects_slug_idx").on(table.slug),
  index("subjects_category_idx").on(table.categoryId),
  index("subjects_institution_idx").on(table.institutionId),
]);

// =============================================================================
// COURSES
// =============================================================================

/**
 * Courses - main course catalog
 * All courses must belong to an institution
 */
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  thumbnail: text("thumbnail"),
  previewVideo: text("preview_video"),

  // Course level and language
  level: text("level", { enum: ["beginner", "intermediate", "advanced", "expert"] })
    .default("beginner")
    .notNull(),
  language: text("language").default("en").notNull(),

  // Pricing (stored as text for precision)
  price: text("price").default("0.00").notNull(),
  discountPrice: text("discount_price"),
  currency: text("currency").default("USD").notNull(),

  // Status and visibility
  status: text("status", { enum: ["draft", "published", "archived", "under_review"] })
    .default("draft")
    .notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false).notNull(),
  isPrivate: integer("is_private", { mode: "boolean" }).default(false).notNull(),

  // Course metadata
  duration: integer("duration"), // in minutes
  totalLessons: integer("total_lessons").default(0).notNull(),
  totalQuizzes: integer("total_quizzes").default(0).notNull(),
  totalAssignments: integer("total_assignments").default(0).notNull(),

  // SEO and content (stored as JSON text)
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  prerequisites: text("prerequisites", { mode: "json" }).$type<string[]>().default([]),
  learningObjectives: text("learning_objectives", { mode: "json" }).$type<string[]>().default([]),
  targetAudience: text("target_audience", { mode: "json" }).$type<string[]>().default([]),

  // Relations
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  instructorId: text("instructor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),

  // Timestamps
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("courses_slug_institution_idx").on(table.slug, table.institutionId),
  index("courses_status_idx").on(table.status),
  index("courses_instructor_idx").on(table.instructorId),
  index("courses_institution_idx").on(table.institutionId),
  index("courses_category_idx").on(table.categoryId),
]);

// =============================================================================
// COURSE STRUCTURE
// =============================================================================

/**
 * Course modules - sections/chapters within a course
 */
export const courseModules = sqliteTable("course_modules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),

  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),

  displayOrder: integer("display_order").default(0).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("course_modules_course_idx").on(table.courseId),
  index("course_modules_order_idx").on(table.courseId, table.displayOrder),
]);

/**
 * Lessons - individual learning units
 * Content supports: text, video, audio, documents, interactive
 */
export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),

  // Unified content field (JSON)
  content: text("content", { mode: "json" }).$type<{
    type: "text" | "video" | "audio" | "document" | "interactive";
    text?: string;
    url?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }>(),

  // Structure
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => courseModules.id, { onDelete: "set null" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),

  displayOrder: integer("display_order").default(0).notNull(),

  // Settings
  isPreview: integer("is_preview", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  isRequired: integer("is_required", { mode: "boolean" }).default(true).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  index("lessons_course_idx").on(table.courseId),
  index("lessons_module_idx").on(table.moduleId),
  index("lessons_slug_course_idx").on(table.courseId, table.slug),
]);

// Zod schemas
export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});
export const selectCategorySchema = createSelectSchema(categories);

export const insertSubjectSchema = createInsertSchema(subjects, {
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});
export const selectSubjectSchema = createSelectSchema(subjects);

export const insertCourseSchema = createInsertSchema(courses, {
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
});
export const selectCourseSchema = createSelectSchema(courses);

export const insertCourseModuleSchema = createInsertSchema(courseModules, {
  title: z.string().min(1).max(200),
});
export const selectCourseModuleSchema = createSelectSchema(courseModules);

export const insertLessonSchema = createInsertSchema(lessons, {
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
});
export const selectLessonSchema = createSelectSchema(lessons);

// Types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseModule = typeof courseModules.$inferSelect;
export type NewCourseModule = typeof courseModules.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

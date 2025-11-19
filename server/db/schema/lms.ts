/**
 * LMS Features Schema
 *
 * Handles:
 * - Enrollments and progress tracking
 * - Quizzes and assessments
 * - Assignments and submissions
 * - Certificates
 * - Reviews and ratings
 */

import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";
import { institutions } from "./institutions";
import { courses, lessons } from "./courses";

// =============================================================================
// ENROLLMENTS & PROGRESS
// =============================================================================

/**
 * Enrollments - student course registrations
 */
export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    // Enrollment details
    status: text("status", { enum: ["active", "completed", "dropped", "suspended"] })
      .default("active")
      .notNull(),
    enrollmentType: text("enrollment_type", { enum: ["free", "paid", "gifted", "scholarship"] })
      .default("free")
      .notNull(),

    // Progress tracking
    progress: integer("progress").default(0).notNull(), // 0-100
    completedLessons: integer("completed_lessons").default(0).notNull(),
    completedQuizzes: integer("completed_quizzes").default(0).notNull(),
    completedAssignments: integer("completed_assignments").default(0).notNull(),

    // Dates
    enrolledAt: integer("enrolled_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),

    // Grades
    finalGrade: integer("final_grade"), // percentage
    certificateIssued: integer("certificate_issued", { mode: "boolean" }).default(false).notNull(),
    certificateIssuedAt: integer("certificate_issued_at", { mode: "timestamp" }),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("enrollments_user_course_idx").on(table.userId, table.courseId),
    index("enrollments_status_idx").on(table.status),
    index("enrollments_institution_idx").on(table.institutionId),
  ]
);

/**
 * Lesson progress - tracks individual lesson completion
 */
export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    // Progress
    status: text("status", { enum: ["not_started", "in_progress", "completed"] })
      .default("not_started")
      .notNull(),
    completionPercentage: integer("completion_percentage").default(0).notNull(),
    timeSpent: integer("time_spent").default(0).notNull(), // seconds

    // Media progress (for video/audio)
    watchTime: integer("watch_time").default(0).notNull(), // seconds
    lastPosition: integer("last_position").default(0).notNull(), // seconds

    // Timestamps
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("lesson_progress_user_lesson_idx").on(table.userId, table.lessonId),
    index("lesson_progress_course_idx").on(table.courseId),
  ]
);

// =============================================================================
// QUIZZES & ASSESSMENTS
// =============================================================================

/**
 * Quizzes - course assessments
 */
export const quizzes = sqliteTable(
  "quizzes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"),

    // Quiz settings
    timeLimit: integer("time_limit"), // minutes
    passingScore: integer("passing_score").default(70).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    shuffleQuestions: integer("shuffle_questions", { mode: "boolean" }).default(false).notNull(),
    shuffleOptions: integer("shuffle_options", { mode: "boolean" }).default(false).notNull(),
    showResults: integer("show_results", { mode: "boolean" }).default(true).notNull(),
    showCorrectAnswers: integer("show_correct_answers", { mode: "boolean" })
      .default(true)
      .notNull(),

    // Relations
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quizzes_course_idx").on(table.courseId),
    index("quizzes_lesson_idx").on(table.lessonId),
  ]
);

/**
 * Quiz questions
 */
export const quizQuestions = sqliteTable(
  "quiz_questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    questionType: text("question_type", {
      enum: ["multiple_choice", "single_choice", "true_false", "short_answer", "essay"],
    })
      .default("single_choice")
      .notNull(),

    explanation: text("explanation"),
    points: integer("points").default(1).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),

    // Options and answers (JSON)
    options: text("options", { mode: "json" })
      .$type<Array<{ id: string; text: string; isCorrect: boolean }>>()
      .default([]),
    correctAnswers: text("correct_answers", { mode: "json" }).$type<string[]>().default([]),

    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quiz_questions_quiz_idx").on(table.quizId),
    index("quiz_questions_order_idx").on(table.quizId, table.displayOrder),
  ]
);

/**
 * Quiz attempts - student quiz submissions
 */
export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    attemptNumber: integer("attempt_number").notNull(),
    status: text("status", { enum: ["in_progress", "completed", "abandoned"] })
      .default("in_progress")
      .notNull(),

    // Scoring
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers").default(0).notNull(),
    score: integer("score").default(0).notNull(), // percentage
    maxScore: integer("max_score").notNull(),
    passed: integer("passed", { mode: "boolean" }).default(false).notNull(),

    // Timing
    timeLimit: integer("time_limit"), // minutes
    timeSpent: integer("time_spent").default(0).notNull(), // seconds

    // Timestamps
    startedAt: integer("started_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("quiz_attempts_user_quiz_idx").on(table.userId, table.quizId),
    index("quiz_attempts_course_idx").on(table.courseId),
  ]
);

/**
 * Quiz answers - individual question responses
 */
export const quizAnswers = sqliteTable(
  "quiz_answers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Answer data
    selectedOptions: text("selected_options", { mode: "json" }).$type<string[]>().default([]),
    textAnswer: text("text_answer"),
    isCorrect: integer("is_correct", { mode: "boolean" }).default(false).notNull(),
    points: integer("points").default(0).notNull(),

    answeredAt: integer("answered_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quiz_answers_attempt_idx").on(table.attemptId),
    index("quiz_answers_question_idx").on(table.questionId),
  ]
);

// =============================================================================
// ASSIGNMENTS
// =============================================================================

/**
 * Assignments - course assignments
 */
export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"),

    // Assignment settings
    maxScore: integer("max_score").default(100).notNull(),
    dueDate: integer("due_date", { mode: "timestamp" }),
    allowLateSubmission: integer("allow_late_submission", { mode: "boolean" })
      .default(false)
      .notNull(),
    lateSubmissionPenalty: integer("late_submission_penalty").default(0).notNull(), // percentage

    // File settings
    allowedFileTypes: text("allowed_file_types", { mode: "json" }).$type<string[]>().default([]),
    maxFileSize: integer("max_file_size").default(10485760).notNull(), // bytes
    maxFiles: integer("max_files").default(1).notNull(),

    // Relations
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("assignments_course_idx").on(table.courseId),
    index("assignments_lesson_idx").on(table.lessonId),
    index("assignments_due_date_idx").on(table.dueDate),
  ]
);

/**
 * Assignment submissions
 */
export const assignmentSubmissions = sqliteTable(
  "assignment_submissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    // Submission content
    content: text("content"),
    attachments: text("attachments", { mode: "json" })
      .$type<
        Array<{
          name: string;
          url: string;
          size: number;
          type: string;
        }>
      >()
      .default([]),
    notes: text("notes"),

    // Status and grading
    status: text("status", { enum: ["draft", "submitted", "graded", "returned"] })
      .default("draft")
      .notNull(),
    score: integer("score"),
    maxScore: integer("max_score"),
    grade: text("grade"),
    feedback: text("feedback"),

    // Timing
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    gradedAt: integer("graded_at", { mode: "timestamp" }),
    isLate: integer("is_late", { mode: "boolean" }).default(false).notNull(),

    // Relations
    gradedBy: text("graded_by").references(() => users.id),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("assignment_submissions_user_assignment_idx").on(table.userId, table.assignmentId),
    index("assignment_submissions_course_idx").on(table.courseId),
    index("assignment_submissions_status_idx").on(table.status),
  ]
);

// =============================================================================
// CERTIFICATES
// =============================================================================

/**
 * Certificates - course completion certificates
 */
export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    // Certificate details
    certificateNumber: text("certificate_number").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),

    // Template and customization
    template: text("template").default("default").notNull(),
    customFields: text("custom_fields", { mode: "json" })
      .$type<Record<string, string>>()
      .default({}),

    // Verification
    verificationCode: text("verification_code").notNull().unique(),
    isVerified: integer("is_verified", { mode: "boolean" }).default(true).notNull(),

    // URLs
    certificateUrl: text("certificate_url"),
    downloadUrl: text("download_url"),

    // Timestamps
    issuedAt: integer("issued_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
  },
  (table) => [
    index("certificates_user_course_idx").on(table.userId, table.courseId),
    index("certificates_number_idx").on(table.certificateNumber),
    index("certificates_verification_idx").on(table.verificationCode),
  ]
);

// =============================================================================
// REVIEWS & RATINGS
// =============================================================================

/**
 * Course reviews
 */
export const courseReviews = sqliteTable(
  "course_reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),

    // Review content
    rating: integer("rating").notNull(), // 1-5
    title: text("title"),
    content: text("content"),

    // Metadata
    isVerifiedPurchase: integer("is_verified_purchase", { mode: "boolean" })
      .default(false)
      .notNull(),
    isApproved: integer("is_approved", { mode: "boolean" }).default(true).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("course_reviews_user_course_idx").on(table.userId, table.courseId),
    index("course_reviews_course_idx").on(table.courseId),
    index("course_reviews_rating_idx").on(table.rating),
  ]
);

/**
 * Wishlists
 */
export const wishlists = sqliteTable(
  "wishlists",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.courseId] }),
    index("wishlists_user_idx").on(table.userId),
  ]
);

// Zod schemas
export const insertEnrollmentSchema = createInsertSchema(enrollments);
export const selectEnrollmentSchema = createSelectSchema(enrollments);

export const insertLessonProgressSchema = createInsertSchema(lessonProgress);
export const selectLessonProgressSchema = createSelectSchema(lessonProgress);

export const insertQuizSchema = createInsertSchema(quizzes, {
  title: z.string().min(1).max(200),
});
export const selectQuizSchema = createSelectSchema(quizzes);

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions, {
  question: z.string().min(1),
});
export const selectQuizQuestionSchema = createSelectSchema(quizQuestions);

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts);
export const selectQuizAttemptSchema = createSelectSchema(quizAttempts);

export const insertAssignmentSchema = createInsertSchema(assignments, {
  title: z.string().min(1).max(200),
});
export const selectAssignmentSchema = createSelectSchema(assignments);

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions);
export const selectAssignmentSubmissionSchema = createSelectSchema(assignmentSubmissions);

export const insertCertificateSchema = createInsertSchema(certificates);
export const selectCertificateSchema = createSelectSchema(certificates);

export const insertCourseReviewSchema = createInsertSchema(courseReviews, {
  rating: z.number().min(1).max(5),
});
export const selectCourseReviewSchema = createSelectSchema(courseReviews);

// Types
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type NewQuizAnswer = typeof quizAnswers.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type CourseReview = typeof courseReviews.$inferSelect;
export type NewCourseReview = typeof courseReviews.$inferInsert;
export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

// Relations
export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  institution: one(institutions, {
    fields: [enrollments.institutionId],
    references: [institutions.id],
  }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [lessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
  course: one(courses, {
    fields: [lessonProgress.courseId],
    references: [courses.id],
  }),
  institution: one(institutions, {
    fields: [lessonProgress.institutionId],
    references: [institutions.id],
  }),
}));

export const courseReviewsRelations = relations(courseReviews, ({ one }) => ({
  user: one(users, {
    fields: [courseReviews.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [courseReviews.courseId],
    references: [courses.id],
  }),
  institution: one(institutions, {
    fields: [courseReviews.institutionId],
    references: [institutions.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [wishlists.courseId],
    references: [courses.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [quizzes.lessonId],
    references: [lessons.id],
  }),
  institution: one(institutions, {
    fields: [quizzes.institutionId],
    references: [institutions.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  course: one(courses, {
    fields: [quizAttempts.courseId],
    references: [courses.id],
  }),
  institution: one(institutions, {
    fields: [quizAttempts.institutionId],
    references: [institutions.id],
  }),
  answers: many(quizAnswers),
}));

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAnswers.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(quizQuestions, {
    fields: [quizAnswers.questionId],
    references: [quizQuestions.id],
  }),
  user: one(users, {
    fields: [quizAnswers.userId],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [assignments.lessonId],
    references: [lessons.id],
  }),
  institution: one(institutions, {
    fields: [assignments.institutionId],
    references: [institutions.id],
  }),
  submissions: many(assignmentSubmissions),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [assignmentSubmissions.userId],
    references: [users.id],
  }),
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id],
  }),
  course: one(courses, {
    fields: [assignmentSubmissions.courseId],
    references: [courses.id],
  }),
  institution: one(institutions, {
    fields: [assignmentSubmissions.institutionId],
    references: [institutions.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id],
  }),
  enrollment: one(enrollments, {
    fields: [certificates.enrollmentId],
    references: [enrollments.id],
  }),
  institution: one(institutions, {
    fields: [certificates.institutionId],
    references: [institutions.id],
  }),
}));

/**
 * Database Schema - Main Export
 *
 * Organized schema structure:
 * - auth.ts: User accounts and roles
 * - institutions.ts: Institution management and membership
 * - courses.ts: Course catalog and structure
 * - lms.ts: LMS features (enrollments, quizzes, assignments, etc.)
 */

// Export all tables
export * from "./auth";
export * from "./institutions";
export * from "./courses";
export * from "./lms";

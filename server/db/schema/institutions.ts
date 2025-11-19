/**
 * Institutions Schema
 *
 * Manages educational institutions and member access
 * - Users can register institutions (pending approval)
 * - Admins approve/reject institutions
 * - Approved institutions can create courses
 * - Institution members can be instructors or admins
 */

import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

/**
 * Institutions table - educational organizations
 * Status flow: pending -> approved (by admin) OR rejected
 */
export const institutions = sqliteTable(
  "institutions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    website: text("website"),

    // Contact information
    email: text("email"),
    phone: text("phone"),
    address: text("address"),

    // Approval workflow
    status: text("status", { enum: ["pending", "approved", "rejected", "suspended"] })
      .default("pending")
      .notNull(),

    // Owner/creator of the institution
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Admin who approved/rejected
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
    rejectionReason: text("rejection_reason"),

    // Settings
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    maxCourses: integer("max_courses").default(100), // null = unlimited
    maxInstructors: integer("max_instructors").default(50),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("institutions_slug_idx").on(table.slug),
    index("institutions_status_idx").on(table.status),
    index("institutions_owner_idx").on(table.ownerId),
  ]
);

/**
 * Institution members - users with access to manage institution
 * Roles: admin (full access), instructor (can create/edit courses)
 */
export const institutionMembers = sqliteTable(
  "institution_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Member role within institution
    role: text("role", { enum: ["admin", "instructor"] })
      .default("instructor")
      .notNull(),

    // Permissions
    canCreateCourses: integer("can_create_courses", { mode: "boolean" }).default(true).notNull(),
    canEditAllCourses: integer("can_edit_all_courses", { mode: "boolean" })
      .default(false)
      .notNull(),
    canManageMembers: integer("can_manage_members", { mode: "boolean" }).default(false).notNull(),

    // Status
    status: text("status", { enum: ["active", "inactive", "suspended"] })
      .default("active")
      .notNull(),

    // Invited by
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    invitedAt: integer("invited_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),

    // Timestamps
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("institution_members_institution_idx").on(table.institutionId),
    index("institution_members_user_idx").on(table.userId),
    index("institution_members_unique_idx").on(table.institutionId, table.userId),
  ]
);

/**
 * Institution invitations - pending member invites
 */
export const institutionInvitations = sqliteTable(
  "institution_invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "instructor"] })
      .default("instructor")
      .notNull(),

    // Invitation metadata
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: text("status", { enum: ["pending", "accepted", "rejected", "expired"] })
      .default("pending")
      .notNull(),

    // Expiration
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("institution_invitations_institution_idx").on(table.institutionId),
    index("institution_invitations_email_idx").on(table.email),
    index("institution_invitations_token_idx").on(table.token),
  ]
);

// Zod schemas
export const insertInstitutionSchema = createInsertSchema(institutions, {
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
});

export const selectInstitutionSchema = createSelectSchema(institutions);

export const insertInstitutionMemberSchema = createInsertSchema(institutionMembers);
export const selectInstitutionMemberSchema = createSelectSchema(institutionMembers);

export const insertInstitutionInvitationSchema = createInsertSchema(institutionInvitations, {
  email: z.string().email(),
});
export const selectInstitutionInvitationSchema = createSelectSchema(institutionInvitations);

// Types
export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;
export type InstitutionMember = typeof institutionMembers.$inferSelect;
export type NewInstitutionMember = typeof institutionMembers.$inferInsert;
export type InstitutionInvitation = typeof institutionInvitations.$inferSelect;
export type NewInstitutionInvitation = typeof institutionInvitations.$inferInsert;

// Relations
export const institutionsRelations = relations(institutions, ({ one, many }) => ({
  owner: one(users, {
    fields: [institutions.ownerId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [institutions.reviewedBy],
    references: [users.id],
  }),
  members: many(institutionMembers),
  invitations: many(institutionInvitations),
}));

export const institutionMembersRelations = relations(institutionMembers, ({ one }) => ({
  institution: one(institutions, {
    fields: [institutionMembers.institutionId],
    references: [institutions.id],
  }),
  user: one(users, {
    fields: [institutionMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [institutionMembers.invitedBy],
    references: [users.id],
  }),
}));

export const institutionInvitationsRelations = relations(institutionInvitations, ({ one }) => ({
  institution: one(institutions, {
    fields: [institutionInvitations.institutionId],
    references: [institutions.id],
  }),
  invitedBy: one(users, {
    fields: [institutionInvitations.invitedBy],
    references: [users.id],
  }),
}));

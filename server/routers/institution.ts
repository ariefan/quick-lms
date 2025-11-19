/**
 * Institution Router
 *
 * Handles institution management, approval workflow, and member access
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  institutions,
  institutionMembers,
  institutionInvitations,
  insertInstitutionSchema,
  type Institution,
} from "../db/schema/institutions";
import { users } from "../db/schema";

/**
 * Helper: Generate URL-friendly slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Helper: Generate invitation token
 */
function generateInvitationToken(): string {
  return crypto.randomUUID() + "-" + Date.now().toString(36);
}

/**
 * Helper: Check if user is institution admin
 */
async function isInstitutionAdmin(
  db: any,
  institutionId: string,
  userId: string
): Promise<boolean> {
  const member = await db.query.institutionMembers.findFirst({
    where: and(
      eq(institutionMembers.institutionId, institutionId),
      eq(institutionMembers.userId, userId),
      eq(institutionMembers.role, "admin"),
      eq(institutionMembers.status, "active")
    ),
  });
  return !!member;
}

/**
 * Helper: Check if user can manage institution (owner or admin member)
 */
async function canManageInstitution(
  db: any,
  institutionId: string,
  userId: string
): Promise<boolean> {
  const institution = await db.query.institutions.findFirst({
    where: eq(institutions.id, institutionId),
  });

  if (!institution) return false;
  if (institution.ownerId === userId) return true;

  return isInstitutionAdmin(db, institutionId, userId);
}

export const institutionRouter = createTRPCRouter({
  /**
   * Create new institution (requires approval)
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        website: z.string().url().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.name);

      // Check if slug already exists
      const existing = await ctx.db.query.institutions.findFirst({
        where: eq(institutions.slug, slug),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An institution with this name already exists",
        });
      }

      const [institution] = await ctx.db
        .insert(institutions)
        .values({
          ...input,
          slug,
          ownerId: ctx.session.userId,
          status: "pending",
        })
        .returning();

      // Automatically add owner as admin member
      await ctx.db.insert(institutionMembers).values({
        institutionId: institution.id,
        userId: ctx.session.userId,
        role: "admin",
        canCreateCourses: true,
        canEditAllCourses: true,
        canManageMembers: true,
        status: "active",
      });

      return institution;
    }),

  /**
   * Get institution by ID
   */
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const institution = await ctx.db.query.institutions.findFirst({
      where: eq(institutions.id, input.id),
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!institution) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Institution not found",
      });
    }

    return institution;
  }),

  /**
   * Get all institutions (admin only, includes pending)
   */
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view all institutions",
        });
      }

      const where = input?.status ? eq(institutions.status, input.status) : undefined;

      const results = await ctx.db.query.institutions.findMany({
        where,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: [desc(institutions.createdAt)],
        with: {
          owner: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return results;
    }),

  /**
   * Get approved institutions (public)
   */
  getApproved: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.institutions.findMany({
        where: and(eq(institutions.status, "approved"), eq(institutions.isActive, true)),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: [desc(institutions.createdAt)],
      });
    }),

  /**
   * Get pending institutions (admin only)
   */
  getPending: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.userId),
    });

    if (user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can view pending institutions",
      });
    }

    return ctx.db.query.institutions.findMany({
      where: eq(institutions.status, "pending"),
      orderBy: [desc(institutions.createdAt)],
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }),

  /**
   * Get my institutions (where I'm owner or member)
   */
  getMy: protectedProcedure.query(async ({ ctx }) => {
    // Get institutions where user is owner
    const ownedInstitutions = await ctx.db.query.institutions.findMany({
      where: eq(institutions.ownerId, ctx.session.userId),
      orderBy: [desc(institutions.createdAt)],
    });

    // Get institutions where user is member
    const memberships = await ctx.db.query.institutionMembers.findMany({
      where: and(
        eq(institutionMembers.userId, ctx.session.userId),
        eq(institutionMembers.status, "active")
      ),
      with: {
        institution: true,
      },
    });

    const memberInstitutions = memberships.map((m) => m.institution);

    // Combine and deduplicate
    const allInstitutions = [...ownedInstitutions];
    for (const inst of memberInstitutions) {
      if (!allInstitutions.find((i) => i.id === (inst as any).id)) {
        allInstitutions.push(inst as any);
      }
    }

    return allInstitutions;
  }),

  /**
   * Update institution (owner or admin only)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        logo: z.string().optional(),
        website: z.string().url().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Check permission
      const canManage = await canManageInstitution(ctx.db, id, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this institution",
        });
      }

      // If name is being updated, regenerate slug
      if (updates.name) {
        const slug = generateSlug(updates.name);
        const existing = await ctx.db.query.institutions.findFirst({
          where: and(eq(institutions.slug, slug), eq(institutions.id, id)),
        });

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An institution with this name already exists",
          });
        }

        Object.assign(updates, { slug });
      }

      const [updated] = await ctx.db
        .update(institutions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(institutions.id, id))
        .returning();

      return updated;
    }),

  /**
   * Approve institution (admin only)
   */
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can approve institutions",
        });
      }

      const [updated] = await ctx.db
        .update(institutions)
        .set({
          status: "approved",
          reviewedBy: ctx.session.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(institutions.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Reject institution (admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can reject institutions",
        });
      }

      const [updated] = await ctx.db
        .update(institutions)
        .set({
          status: "rejected",
          rejectionReason: input.reason,
          reviewedBy: ctx.session.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(institutions.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Suspend institution (admin only)
   */
  suspend: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can suspend institutions",
        });
      }

      const [updated] = await ctx.db
        .update(institutions)
        .set({
          status: "suspended",
          rejectionReason: input.reason,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(institutions.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete institution (owner only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const institution = await ctx.db.query.institutions.findFirst({
        where: eq(institutions.id, input.id),
      });

      if (!institution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Institution not found",
        });
      }

      if (institution.ownerId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can delete this institution",
        });
      }

      await ctx.db.delete(institutions).where(eq(institutions.id, input.id));

      return { success: true };
    }),

  /**
   * Get institution members
   */
  getMembers: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user has access to this institution
      const canManage = await canManageInstitution(ctx.db, input.institutionId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view members",
        });
      }

      return ctx.db.query.institutionMembers.findMany({
        where: eq(institutionMembers.institutionId, input.institutionId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: [desc(institutionMembers.joinedAt)],
      });
    }),

  /**
   * Remove member from institution
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        institutionId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const canManage = await canManageInstitution(ctx.db, input.institutionId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to remove members",
        });
      }

      // Cannot remove institution owner
      const institution = await ctx.db.query.institutions.findFirst({
        where: eq(institutions.id, input.institutionId),
      });

      const member = await ctx.db.query.institutionMembers.findFirst({
        where: eq(institutionMembers.id, input.memberId),
      });

      if (member?.userId === institution?.ownerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove institution owner",
        });
      }

      await ctx.db.delete(institutionMembers).where(eq(institutionMembers.id, input.memberId));

      return { success: true };
    }),

  /**
   * Update member role and permissions
   */
  updateMember: protectedProcedure
    .input(
      z.object({
        institutionId: z.string(),
        memberId: z.string(),
        role: z.enum(["admin", "instructor"]).optional(),
        canCreateCourses: z.boolean().optional(),
        canEditAllCourses: z.boolean().optional(),
        canManageMembers: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { institutionId, memberId, ...updates } = input;

      // Check permission
      const canManage = await canManageInstitution(ctx.db, institutionId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update members",
        });
      }

      const [updated] = await ctx.db
        .update(institutionMembers)
        .set(updates)
        .where(eq(institutionMembers.id, memberId))
        .returning();

      return updated;
    }),

  /**
   * Create invitation to join institution
   */
  createInvitation: protectedProcedure
    .input(
      z.object({
        institutionId: z.string(),
        email: z.string().email(),
        role: z.enum(["admin", "instructor"]).default("instructor"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const member = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, input.institutionId),
          eq(institutionMembers.userId, ctx.session.userId),
          eq(institutionMembers.canManageMembers, true)
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to invite members",
        });
      }

      // Check if user already exists and is already a member
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        const existingMember = await ctx.db.query.institutionMembers.findFirst({
          where: and(
            eq(institutionMembers.institutionId, input.institutionId),
            eq(institutionMembers.userId, existingUser.id)
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this institution",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await ctx.db.query.institutionInvitations.findFirst({
        where: and(
          eq(institutionInvitations.institutionId, input.institutionId),
          eq(institutionInvitations.email, input.email),
          eq(institutionInvitations.status, "pending")
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent to this email",
        });
      }

      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const [invitation] = await ctx.db
        .insert(institutionInvitations)
        .values({
          institutionId: input.institutionId,
          email: input.email,
          role: input.role,
          invitedBy: ctx.session.userId,
          token,
          expiresAt,
        })
        .returning();

      return invitation;
    }),

  /**
   * Get invitations for institution
   */
  getInvitations: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check permission
      const canManage = await canManageInstitution(ctx.db, input.institutionId, ctx.session.userId);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view invitations",
        });
      }

      return ctx.db.query.institutionInvitations.findMany({
        where: eq(institutionInvitations.institutionId, input.institutionId),
        orderBy: [desc(institutionInvitations.createdAt)],
        with: {
          invitedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }),

  /**
   * Accept invitation
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.query.institutionInvitations.findFirst({
        where: eq(institutionInvitations.token, input.token),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been processed",
        });
      }

      if (invitation.expiresAt < new Date()) {
        await ctx.db
          .update(institutionInvitations)
          .set({ status: "expired" })
          .where(eq(institutionInvitations.id, invitation.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      // Verify email matches current user
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (user?.email !== invitation.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is for a different email address",
        });
      }

      // Check if already a member
      const existingMember = await ctx.db.query.institutionMembers.findFirst({
        where: and(
          eq(institutionMembers.institutionId, invitation.institutionId),
          eq(institutionMembers.userId, ctx.session.userId)
        ),
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this institution",
        });
      }

      // Add as member
      await ctx.db.insert(institutionMembers).values({
        institutionId: invitation.institutionId,
        userId: ctx.session.userId,
        role: invitation.role,
        canCreateCourses: true,
        canEditAllCourses: invitation.role === "admin",
        canManageMembers: invitation.role === "admin",
        status: "active",
        invitedBy: invitation.invitedBy,
      });

      // Update invitation status
      await ctx.db
        .update(institutionInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
        })
        .where(eq(institutionInvitations.id, invitation.id));

      return { success: true };
    }),

  /**
   * Cancel invitation
   */
  cancelInvitation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.query.institutionInvitations.findFirst({
        where: eq(institutionInvitations.id, input.id),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check permission
      const canManage = await canManageInstitution(
        ctx.db,
        invitation.institutionId,
        ctx.session.userId
      );
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to cancel this invitation",
        });
      }

      await ctx.db.delete(institutionInvitations).where(eq(institutionInvitations.id, input.id));

      return { success: true };
    }),
});

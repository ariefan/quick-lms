"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface MembersManagerProps {
  institutionId: string;
}

export function MembersManager({ institutionId }: MembersManagerProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"instructor" | "admin">("instructor");
  const [error, setError] = useState("");

  // Fetch members
  const { data: members, refetch: refetchMembers } = trpc.institution.getMembers.useQuery({
    institutionId,
  });

  // Fetch invitations
  const { data: invitations, refetch: refetchInvitations } =
    trpc.institution.getInvitations.useQuery({
      institutionId,
    });

  // Mutations
  const createInvitationMutation = trpc.institution.createInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("instructor");
      setError("");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const cancelInvitationMutation = trpc.institution.cancelInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
    },
  });

  const removeMemberMutation = trpc.institution.removeMember.useMutation({
    onSuccess: () => {
      refetchMembers();
    },
  });

  const updateMemberMutation = trpc.institution.updateMember.useMutation({
    onSuccess: () => {
      refetchMembers();
    },
  });

  const handleInvite = () => {
    setError("");
    if (!inviteEmail.trim()) {
      setError("Email is required");
      return;
    }

    createInvitationMutation.mutate({
      institutionId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this institution?`)) {
      removeMemberMutation.mutate({
        institutionId,
        memberId,
      });
    }
  };

  const handleToggleRole = (memberId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "instructor" : "admin";
    if (confirm(`Change role to ${newRole}?`)) {
      updateMemberMutation.mutate({
        institutionId,
        memberId,
        role: newRole as "admin" | "instructor",
        canEditAllCourses: newRole === "admin",
        canManageMembers: newRole === "admin",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Members</h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {showInviteForm ? "Cancel" : "+ Invite Member"}
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="mb-6 rounded-md border bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold">Invite New Member</h3>

            {error && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "instructor" | "admin")}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Instructors can create courses. Admins can also manage members.
                </p>
              </div>

              <button
                onClick={handleInvite}
                disabled={createInvitationMutation.isPending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2">
          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{(member.user as any).name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">{(member.user as any).email}</div>
                <div className="mt-1 text-xs text-gray-400">
                  Joined: {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleRole(member.id, member.role)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Change to {member.role === "admin" ? "Instructor" : "Admin"}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.id, (member.user as any).name)}
                  disabled={removeMemberMutation.isPending}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {members?.length === 0 && (
            <div className="rounded-md bg-gray-50 p-8 text-center text-gray-500">
              No members yet. Invite someone to get started.
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Pending Invitations</h2>
          <div className="space-y-2">
            {invitations
              .filter((inv) => inv.status === "pending")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-4"
                >
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Role: {invitation.role} | Invited by: {(invitation.invitedBy as any).name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Cancel this invitation?")) {
                        cancelInvitationMutation.mutate({ id: invitation.id });
                      }
                    }}
                    disabled={cancelInvitationMutation.isPending}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

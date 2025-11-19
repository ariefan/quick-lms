"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const router = useRouter();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Quick LMS</h1>
          <p className="mt-2 text-lg text-gray-600">Learning Management System</p>
        </div>

        {isLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : session ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Welcome back!</h2>
              <div className="mt-4 space-y-2 text-left">
                <div>
                  <span className="text-sm font-medium text-gray-500">Name:</span>{" "}
                  <span className="text-sm text-gray-900">{session.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Email:</span>{" "}
                  <span className="text-sm text-gray-900">{session.email}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Role:</span>{" "}
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {session.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Student Features */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Student</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/catalog"
                    className="block rounded-md border border-blue-600 bg-white px-4 py-2 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Browse Courses
                  </Link>
                  <Link
                    href="/learn"
                    className="block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    My Learning
                  </Link>
                  <Link
                    href="/wishlist"
                    className="block rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Wishlist
                  </Link>
                </div>
              </div>

              {/* Instructor Features */}
              {(session.role === "instructor" || session.role === "admin") && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Instructor</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/courses"
                      className="block rounded-md bg-green-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-green-500"
                    >
                      My Courses
                    </Link>
                    <Link
                      href="/institutions/register"
                      className="block rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Register Institution
                    </Link>
                  </div>
                </div>
              )}

              {/* Admin Features */}
              {session.role === "admin" && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Admin</h3>
                  <Link
                    href="/admin/institutions"
                    className="block w-full rounded-md bg-purple-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-purple-500"
                  >
                    Manage Institutions
                  </Link>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50"
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Get started by signing in to your account or creating a new one.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

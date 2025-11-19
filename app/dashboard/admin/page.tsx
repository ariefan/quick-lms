"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading } = trpc.analytics.getAdminDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 text-gray-600">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Platform-wide analytics and metrics</p>
      </div>

      {/* Platform Stats */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Platform Overview</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.platformStats.totalUsers}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">
                +{dashboard.growthStats.newUsers}
              </span>
              <span className="text-sm text-gray-500"> in last 30 days</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Institutions</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.platformStats.totalInstitutions}
                </p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/institutions" className="text-sm text-blue-600 hover:text-blue-500">
                Manage institutions →
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.platformStats.totalCourses}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">
                +{dashboard.growthStats.newCourses}
              </span>
              <span className="text-sm text-gray-500"> in last 30 days</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {dashboard.platformStats.totalEnrollments}
                </p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">
                +{dashboard.growthStats.newEnrollments}
              </span>
              <span className="text-sm text-gray-500"> in last 30 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Stats */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Enrollment Statistics</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Enrollments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {dashboard.enrollmentStats.active}
              </p>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-600"
                  style={{
                    width: `${(dashboard.enrollmentStats.active / dashboard.platformStats.totalEnrollments) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Enrollments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {dashboard.enrollmentStats.completed}
              </p>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-600"
                  style={{
                    width: `${(dashboard.enrollmentStats.completed / dashboard.platformStats.totalEnrollments) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {dashboard.enrollmentStats.completionRate}%
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {dashboard.enrollmentStats.completed} of {dashboard.platformStats.totalEnrollments} completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Growth (Last 30 Days)</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{dashboard.growthStats.newUsers}</p>
            <p className="mt-2 text-sm text-gray-600">New Users</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{dashboard.growthStats.newCourses}</p>
            <p className="mt-2 text-sm text-gray-600">New Courses</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {dashboard.growthStats.newEnrollments}
            </p>
            <p className="mt-2 text-sm text-gray-600">New Enrollments</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Link
          href="/admin/users"
          className="block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Manage Users</h3>
          <p className="mt-1 text-sm text-gray-500">View and manage user accounts</p>
        </Link>

        <Link
          href="/admin/institutions"
          className="block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Manage Institutions</h3>
          <p className="mt-1 text-sm text-gray-500">Approve and manage institutions</p>
        </Link>

        <Link
          href="/admin/reports"
          className="block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Generate Reports</h3>
          <p className="mt-1 text-sm text-gray-500">Export detailed analytics reports</p>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export function CourseCatalog() {
  const [categoryId, setCategoryId] = useState<string>("");
  const [level, setLevel] = useState<string>("");

  const { data: categories } = trpc.course.getCategories.useQuery({ includeGlobal: true });

  const { data: courses, isLoading } = trpc.course.getCourses.useQuery({
    status: "published",
    categoryId: categoryId || undefined,
    level: (level as any) || undefined,
    limit: 50,
  });

  const getLevelBadge = (level: string) => {
    const levelStyles = {
      beginner: "bg-green-50 text-green-700 border-green-200",
      intermediate: "bg-blue-50 text-blue-700 border-blue-200",
      advanced: "bg-purple-50 text-purple-700 border-purple-200",
      expert: "bg-red-50 text-red-700 border-red-200",
    };

    return (
      <span
        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${levelStyles[level as keyof typeof levelStyles]}`}
      >
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Explore Courses</h1>
        <p className="mt-4 text-lg text-gray-600">
          Discover courses from institutions around the world
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="text-center text-gray-500">Loading courses...</div>
      ) : courses?.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No courses found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your filters to see more courses.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course) => (
            <Link
              key={course.id}
              href={`/catalog/${course.id}`}
              className="group rounded-lg border bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Course Thumbnail */}
              <div className="relative h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-500 to-purple-600">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl text-white opacity-80">
                    📚
                  </div>
                )}
                {/* Price Badge */}
                <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold">
                  {course.price === "0.00" || course.price === "0" ? "Free" : `$${course.price}`}
                </div>
              </div>

              {/* Course Info */}
              <div className="p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                    {course.title}
                  </h3>
                  {course.shortDescription && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {course.shortDescription}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2">
                  {getLevelBadge(course.level)}
                  {course.category && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{course.category.name}</span>
                    </>
                  )}
                </div>

                {/* Institution & Instructor */}
                <div className="space-y-1 border-t pt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🏛️</span>
                    <span>{course.institution.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>👤</span>
                    <span>{course.instructor.name}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

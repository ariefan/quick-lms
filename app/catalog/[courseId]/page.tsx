"use client";

import { trpc } from "@/lib/trpc/client";
import { EnrollButton } from "@/components/student/enroll-button";
import { WishlistButton } from "@/components/student/wishlist-button";
import { CourseReviews } from "@/components/student/course-reviews";
import { useRouter } from "next/navigation";

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const { data: course, isLoading } = trpc.course.getById.useQuery({ id: params.courseId });

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center text-gray-500">Course not found</div>;
  }

  if (course.status !== "published") {
    return (
      <div className="rounded-md bg-yellow-50 p-8 text-center">
        <h3 className="text-lg font-medium text-yellow-800">Course Not Available</h3>
        <p className="mt-2 text-sm text-yellow-700">
          This course is not currently published and is not available for enrollment.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="mb-4">
                  <button
                    onClick={() => router.push("/catalog")}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Back to Catalog
                  </button>
                </div>

                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>

                {course.shortDescription && (
                  <p className="mt-2 text-lg text-gray-600">{course.shortDescription}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    {(course.institution as any).name}
                  </span>
                  <span>•</span>
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-green-600">
                    {course.price === "0.00" || course.price === "0" ? "Free" : `$${course.price}`}
                  </span>
                  <span>•</span>
                  <span>{course.totalLessons} lessons</span>
                </div>
              </div>

              {/* Course Thumbnail */}
              <div className="flex h-40 w-60 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="text-6xl text-white opacity-80">📚</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-3">
              <EnrollButton courseId={course.id} courseName={course.title} price={course.price} />
              <WishlistButton courseId={course.id} variant="button" />
            </div>
          </div>
        </div>

        {/* Course Description */}
        {course.description && (
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">About this Course</h2>
            <div className="prose max-w-none text-gray-700">
              <p className="whitespace-pre-wrap">{course.description}</p>
            </div>
          </div>
        )}

        {/* Course Content */}
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Course Content</h2>
          <div className="space-y-3">
            {course.modules && course.modules.length > 0 ? (
              course.modules.map((module, moduleIndex) => (
                <div key={module.id} className="rounded-md border">
                  <div className="bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">
                      {moduleIndex + 1}. {module.title}
                    </h3>
                    {module.description && (
                      <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                    )}
                  </div>
                  {module.lessons && module.lessons.length > 0 && (
                    <div className="divide-y px-4">
                      {module.lessons.map((lesson: any, lessonIndex: number) => (
                        <div key={lesson.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{lessonIndex + 1}.</span>
                            <span className="text-sm">{lesson.title}</span>
                            {lesson.isPreview && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Preview
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No modules have been added yet.</p>
            )}
          </div>
        </div>

        {/* Instructor */}
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Instructor</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl text-white">
              {(course.instructor as any).name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold">{(course.instructor as any).name}</h3>
              <p className="text-sm text-gray-600">Course Instructor</p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <CourseReviews courseId={course.id} />
        </div>
      </div>
    </div>
  );
}

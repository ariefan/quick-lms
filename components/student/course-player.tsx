"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CoursePlayerProps {
  courseId: string;
  initialLessonId?: string;
}

export function CoursePlayer({ courseId, initialLessonId }: CoursePlayerProps) {
  const router = useRouter();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId || null);

  const { data: course, isLoading: courseLoading } = trpc.course.getById.useQuery({
    id: courseId,
  });

  const { data: enrollment } = trpc.student.getEnrollmentStatus.useQuery({ courseId });

  const { data: progress, refetch: refetchProgress } = trpc.student.getCourseProgress.useQuery({
    courseId,
  });

  const markCompleteMutation = trpc.student.markLessonComplete.useMutation({
    onSuccess: () => {
      refetchProgress();
    },
  });

  // Set initial lesson if not set
  useEffect(() => {
    if (!selectedLessonId && course?.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        setSelectedLessonId(firstModule.lessons[0].id);
      }
    }
  }, [course, selectedLessonId]);

  if (courseLoading) {
    return <div className="text-center text-gray-500">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center text-gray-500">Course not found</div>;
  }

  if (!enrollment || !enrollment.enrollment || enrollment.enrollment.status !== "active") {
    return (
      <div className="rounded-md bg-yellow-50 p-8 text-center">
        <h3 className="text-lg font-medium text-yellow-800">Enrollment Required</h3>
        <p className="mt-2 text-sm text-yellow-700">
          You need to enroll in this course to access the content.
        </p>
        <button
          onClick={() => router.push(`/catalog/${courseId}`)}
          className="mt-4 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500"
        >
          Go to Course Page
        </button>
      </div>
    );
  }

  const selectedLesson = course.modules
    ?.flatMap((m) => m.lessons || [])
    .find((l) => l.id === selectedLessonId);

  const lessonProgress = progress?.lessonProgress?.find((lp) => lp.lessonId === selectedLessonId);

  const handleMarkComplete = () => {
    if (!selectedLessonId) return;
    markCompleteMutation.mutate({
      lessonId: selectedLessonId,
      courseId,
    });
  };

  const getAllLessons = () => {
    return course.modules?.flatMap((m) => m.lessons || []) || [];
  };

  const getCurrentLessonIndex = () => {
    const allLessons = getAllLessons();
    return allLessons.findIndex((l) => l.id === selectedLessonId);
  };

  const goToNextLesson = () => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < allLessons.length - 1) {
      setSelectedLessonId(allLessons[currentIndex + 1].id);
    }
  };

  const goToPreviousLesson = () => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      setSelectedLessonId(allLessons[currentIndex - 1].id);
    }
  };

  const currentIndex = getCurrentLessonIndex();
  const totalLessons = getAllLessons().length;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/learn")}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to My Learning
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{course.title}</h1>
              <p className="text-sm text-gray-500">{(course.institution as any).name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Progress: {progress?.enrollment.progress || 0}%
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${progress?.enrollment.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Course Content */}
        <div className="w-80 overflow-y-auto border-r bg-white">
          <div className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Course Content</h2>
            <div className="space-y-2">
              {course.modules?.map((module, moduleIndex) => (
                <div key={module.id} className="rounded-md border">
                  <div className="bg-gray-50 px-4 py-2">
                    <h3 className="font-medium text-gray-900">
                      {moduleIndex + 1}. {module.title}
                    </h3>
                  </div>
                  <div className="divide-y">
                    {module.lessons?.map((lesson: any, lessonIndex: number) => {
                      const isCompleted = progress?.lessonProgress?.find(
                        (lp) => lp.lessonId === lesson.id && lp.status === "completed"
                      );
                      const isActive = selectedLessonId === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                            isActive ? "bg-blue-50" : ""
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                              isCompleted ? "border-green-600 bg-green-600" : "border-gray-300"
                            }`}
                          >
                            {isCompleted && (
                              <svg
                                className="h-3 w-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className={isActive ? "font-medium text-blue-600" : ""}>
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {selectedLesson ? (
            <div className="mx-auto w-full max-w-4xl p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900">{selectedLesson.title}</h2>
                {selectedLesson.description && (
                  <p className="mt-2 text-gray-600">{selectedLesson.description}</p>
                )}
              </div>

              {/* Lesson Content */}
              <div className="prose max-w-none rounded-lg border bg-white p-8">
                <div className="min-h-[400px]">
                  <p className="text-gray-500">
                    Lesson content will be displayed here. This could include:
                  </p>
                  <ul className="mt-4 text-gray-500">
                    <li>Video player for video lessons</li>
                    <li>Rich text content from the lesson</li>
                    <li>Downloadable resources</li>
                    <li>Interactive elements</li>
                  </ul>
                  <div className="mt-8 rounded-md bg-blue-50 p-4">
                    <p className="text-sm text-blue-800">
                      💡 Content management will be added in a future update. For now, this is a
                      placeholder for lesson content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lesson Actions */}
              <div className="mt-6 flex items-center justify-between border-t pt-6">
                <button
                  onClick={goToPreviousLesson}
                  disabled={currentIndex === 0}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Previous Lesson
                </button>

                <div className="flex items-center gap-3">
                  {lessonProgress?.status === "completed" ? (
                    <span className="flex items-center gap-2 text-sm text-green-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markCompleteMutation.isPending}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      {markCompleteMutation.isPending ? "Marking..." : "Mark as Complete"}
                    </button>
                  )}
                </div>

                <button
                  onClick={goToNextLesson}
                  disabled={currentIndex === totalLessons - 1}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next Lesson →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              Select a lesson from the sidebar to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

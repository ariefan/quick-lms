"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CourseEditorProps {
  courseId: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "content" | "settings">("content");
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const { data: course, isLoading, refetch } = trpc.course.getById.useQuery({ id: courseId });

  const publishMutation = trpc.course.publish.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const unpublishMutation = trpc.course.unpublish.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center text-gray-500">Course not found</div>;
  }

  const getStatusBadge = () => {
    const statusStyles = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      archived: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[course.status as keyof typeof statusStyles]}`}
      >
        {course.status === "under_review"
          ? "Under Review"
          : course.status.charAt(0).toUpperCase() + course.status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {getStatusBadge()}
          </div>
          {course.shortDescription && (
            <p className="mt-2 text-gray-600">{course.shortDescription}</p>
          )}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span>{course.institution.name}</span>
            <span>•</span>
            <span>{course.level}</span>
            <span>•</span>
            <span>{course.price === "0.00" ? "Free" : `$${course.price}`}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {course.status === "draft" ? (
            <button
              onClick={() => publishMutation.mutate({ id: courseId })}
              disabled={publishMutation.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </button>
          ) : course.status === "published" ? (
            <button
              onClick={() => unpublishMutation.mutate({ id: courseId })}
              disabled={unpublishMutation.isPending}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-500 disabled:opacity-50"
            >
              {unpublishMutation.isPending ? "Unpublishing..." : "Unpublish"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(["content", "details", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {activeTab === "content" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Course Content</h2>
              <button
                onClick={() => setShowModuleForm(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                + Add Module
              </button>
            </div>

            {/* New Module Form */}
            {showModuleForm && (
              <ModuleForm
                courseId={courseId}
                onSuccess={() => {
                  setShowModuleForm(false);
                  refetch();
                }}
                onCancel={() => setShowModuleForm(false)}
              />
            )}

            {/* Modules List */}
            <div className="space-y-4">
              {course.modules?.length === 0 ? (
                <div className="rounded-md bg-gray-50 p-8 text-center text-gray-500">
                  No modules yet. Add your first module to start building your course.
                </div>
              ) : (
                course.modules?.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    index={index}
                    onRefetch={refetch}
                    onAddLesson={(moduleId) => {
                      setSelectedModuleId(moduleId);
                      setShowLessonForm(true);
                    }}
                  />
                ))
              )}
            </div>

            {/* New Lesson Form */}
            {showLessonForm && selectedModuleId && (
              <LessonForm
                courseId={courseId}
                moduleId={selectedModuleId}
                onSuccess={() => {
                  setShowLessonForm(false);
                  setSelectedModuleId(null);
                  refetch();
                }}
                onCancel={() => {
                  setShowLessonForm(false);
                  setSelectedModuleId(null);
                }}
              />
            )}
          </div>
        )}

        {activeTab === "details" && <CourseDetailsForm course={course} onRefetch={refetch} />}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Course Settings</h2>
            <div className="rounded-md bg-gray-50 p-4 text-center text-gray-500">
              Settings panel coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Module Form Component
function ModuleForm({
  courseId,
  onSuccess,
  onCancel,
}: {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = trpc.course.createModule.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || undefined,
      courseId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold">New Module</h3>
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Module title"
          required
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Module description (optional)"
          rows={2}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding..." : "Add Module"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// Module Card Component
function ModuleCard({
  module,
  index,
  onRefetch,
  onAddLesson,
}: {
  module: any;
  index: number;
  onRefetch: () => void;
  onAddLesson: (moduleId: string) => void;
}) {
  const deleteMutation = trpc.course.deleteModule.useMutation({
    onSuccess: onRefetch,
  });

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between bg-gray-50 p-4">
        <div className="flex-1">
          <h3 className="font-semibold">
            {index + 1}. {module.title}
          </h3>
          {module.description && <p className="mt-1 text-sm text-gray-600">{module.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAddLesson(module.id)}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
          >
            + Add Lesson
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this module and all its lessons?")) {
                deleteMutation.mutate({ id: module.id });
              }
            }}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Lessons */}
      {module.lessons?.length > 0 && (
        <div className="divide-y">
          {module.lessons.map((lesson: any, lessonIndex: number) => (
            <LessonCard key={lesson.id} lesson={lesson} index={lessonIndex} onRefetch={onRefetch} />
          ))}
        </div>
      )}
    </div>
  );
}

// Lesson Card Component
function LessonCard({
  lesson,
  index,
  onRefetch,
}: {
  lesson: any;
  index: number;
  onRefetch: () => void;
}) {
  const deleteMutation = trpc.course.deleteLesson.useMutation({
    onSuccess: onRefetch,
  });

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{index + 1}.</span>
          <span className="font-medium">{lesson.title}</span>
          {lesson.isPreview && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Preview
            </span>
          )}
        </div>
        {lesson.description && <p className="mt-1 text-sm text-gray-600">{lesson.description}</p>}
      </div>
      <button
        onClick={() => {
          if (confirm("Delete this lesson?")) {
            deleteMutation.mutate({ id: lesson.id });
          }
        }}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
      >
        Delete
      </button>
    </div>
  );
}

// Lesson Form Component
function LessonForm({
  courseId,
  moduleId,
  onSuccess,
  onCancel,
}: {
  courseId: string;
  moduleId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const createMutation = trpc.course.createLesson.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || undefined,
      courseId,
      moduleId,
      isPreview,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-md border bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold">New Lesson</h3>
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          required
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Lesson description (optional)"
          rows={2}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(e) => setIsPreview(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Allow preview (free access)</span>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding..." : "Add Lesson"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// Course Details Form Component
function CourseDetailsForm({ course, onRefetch }: { course: any; onRefetch: () => void }) {
  const [title, setTitle] = useState(course.title);
  const [shortDescription, setShortDescription] = useState(course.shortDescription || "");
  const [description, setDescription] = useState(course.description || "");
  const [price, setPrice] = useState(course.price);

  const updateMutation = trpc.course.update.useMutation({
    onSuccess: onRefetch,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: course.id,
      title,
      shortDescription: shortDescription || undefined,
      description: description || undefined,
      price,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Course Details</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Short Description</label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            maxLength={150}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Full Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Price (USD)</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

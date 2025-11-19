"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface CourseCreateFormProps {
  institutionId: string;
}

export function CourseCreateForm({ institutionId }: CourseCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert">(
    "beginner"
  );
  const [price, setPrice] = useState("0.00");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");

  const { data: categories } = trpc.course.getCategories.useQuery({
    institutionId,
    includeGlobal: true,
  });

  const createMutation = trpc.course.create.useMutation({
    onSuccess: (course) => {
      router.push(`/courses/${course.id}/edit`);
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Course title is required");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      shortDescription: shortDescription.trim() || undefined,
      level,
      price,
      categoryId: categoryId || undefined,
      institutionId,
    });
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create New Course</h2>
        <p className="mt-2 text-sm text-gray-600">
          Fill in the basic information for your course. You can add modules and lessons after
          creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {/* Course Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Course Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Introduction to Web Development"
            />
          </div>

          {/* Short Description */}
          <div>
            <label htmlFor="shortDescription" className="block text-sm font-medium">
              Short Description
            </label>
            <input
              id="shortDescription"
              name="shortDescription"
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="One-line summary of your course"
              maxLength={150}
            />
            <p className="mt-1 text-xs text-gray-500">{shortDescription.length}/150 characters</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Full Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Detailed description of what students will learn..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Level */}
            <div>
              <label htmlFor="level" className="block text-sm font-medium">
                Level
              </label>
              <select
                id="level"
                name="level"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium">
                Price (USD)
              </label>
              <input
                id="price"
                name="price"
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">Set to 0.00 for free course</p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.institutionId && " (Global)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 border-t pt-6">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Course"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500">
          * Required fields. You'll be able to add modules, lessons, and additional details after
          creating the course.
        </p>
      </form>
    </div>
  );
}

import { CourseCreateForm } from "@/components/course/course-create-form";

export default function CreateCoursePage({
  searchParams,
}: {
  searchParams: { institutionId?: string };
}) {
  const institutionId = searchParams.institutionId;

  if (!institutionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Institution Selected</h1>
          <p className="mt-2 text-gray-600">Please select an institution to create a course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <CourseCreateForm institutionId={institutionId} />
    </div>
  );
}

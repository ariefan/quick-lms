import { AssignmentBuilder } from "@/components/course/assignment-builder";

export default async function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Assignment</h1>
        <p className="mt-2 text-gray-600">
          Create an assignment with instructions, due date, and grading criteria.
        </p>
      </div>

      <AssignmentBuilder courseId={id} />
    </div>
  );
}

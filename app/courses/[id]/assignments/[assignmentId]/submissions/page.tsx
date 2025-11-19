import { AssignmentGrading } from "@/components/course/assignment-grading";

export default async function AssignmentSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = await params;

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <AssignmentGrading courseId={id} assignmentId={assignmentId} />
    </div>
  );
}

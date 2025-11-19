import { AssignmentSubmission } from "@/components/student/assignment-submission";

export default async function AssignmentSubmissionPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const { courseId, assignmentId } = await params;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <AssignmentSubmission courseId={courseId} assignmentId={assignmentId} />
    </div>
  );
}

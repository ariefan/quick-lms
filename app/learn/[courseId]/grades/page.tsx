import { StudentGrades } from "@/components/student/student-grades";

export default async function StudentGradesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <StudentGrades courseId={courseId} />
    </div>
  );
}

import { Gradebook } from "@/components/course/gradebook";

export default async function GradebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <Gradebook courseId={id} />
    </div>
  );
}

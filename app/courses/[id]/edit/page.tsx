import { CourseEditor } from "@/components/course/course-editor";

export default function EditCoursePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <CourseEditor courseId={params.id} />
      </div>
    </div>
  );
}

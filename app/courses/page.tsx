import { CourseList } from "@/components/course/course-list";

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <CourseList />
      </div>
    </div>
  );
}

import { CoursePlayer } from "@/components/student/course-player";

export default function CoursePlayerPage({ params }: { params: { courseId: string } }) {
  return <CoursePlayer courseId={params.courseId} />;
}

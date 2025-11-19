"use client";

import { useParams } from "next/navigation";
import { AnnouncementList } from "@/components/course/announcement-list";

export default function AnnouncementsPage() {
  const params = useParams();
  const courseId = params.id as string;

  // TODO: Check if user is instructor
  const isInstructor = false;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <AnnouncementList courseId={courseId} isInstructor={isInstructor} />
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { CreateAnnouncementForm } from "@/components/course/create-announcement-form";

export default function NewAnnouncementPage() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <CreateAnnouncementForm courseId={courseId} />
      </div>
    </div>
  );
}

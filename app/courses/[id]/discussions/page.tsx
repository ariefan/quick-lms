"use client";

import { useParams } from "next/navigation";
import { DiscussionBoard } from "@/components/course/discussion-board";

export default function DiscussionsPage() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <DiscussionBoard courseId={courseId} />
      </div>
    </div>
  );
}

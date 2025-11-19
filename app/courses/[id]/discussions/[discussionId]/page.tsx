"use client";

import { useParams } from "next/navigation";
import { DiscussionThread } from "@/components/course/discussion-thread";

export default function DiscussionThreadPage() {
  const params = useParams();
  const courseId = params.id as string;
  const discussionId = params.discussionId as string;

  // TODO: Check if user is instructor
  const isInstructor = false;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <DiscussionThread
          discussionId={discussionId}
          courseId={courseId}
          isInstructor={isInstructor}
        />
      </div>
    </div>
  );
}

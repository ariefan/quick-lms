"use client";

import { useParams, useSearchParams } from "next/navigation";
import { CreateDiscussionForm } from "@/components/course/create-discussion-form";

export default function NewDiscussionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const lessonId = searchParams.get("lessonId") || undefined;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <CreateDiscussionForm courseId={courseId} lessonId={lessonId} />
      </div>
    </div>
  );
}

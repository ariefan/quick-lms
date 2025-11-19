"use client";

import { trpc } from "@/lib/trpc/client";
import { QuizList } from "./quiz-list";
import { AssignmentList } from "./assignment-list";

interface AssessmentSummaryProps {
  courseId: string;
}

export function AssessmentSummary({ courseId }: AssessmentSummaryProps) {
  return (
    <div className="space-y-8">
      <QuizList courseId={courseId} />
      <AssignmentList courseId={courseId} />
    </div>
  );
}

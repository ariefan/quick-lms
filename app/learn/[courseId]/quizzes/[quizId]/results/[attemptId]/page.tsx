import { QuizResults } from "@/components/student/quiz-results";

export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string; attemptId: string }>;
}) {
  const { courseId, quizId, attemptId } = await params;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <QuizResults courseId={courseId} quizId={quizId} attemptId={attemptId} />
    </div>
  );
}

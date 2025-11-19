import { QuizPlayer } from "@/components/student/quiz-player";

export default async function TakeQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId, quizId } = await params;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <QuizPlayer courseId={courseId} quizId={quizId} />
    </div>
  );
}

import { QuizEditor } from "@/components/course/quiz-editor";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Quiz</h1>
        <p className="mt-2 text-gray-600">Update quiz settings and manage questions.</p>
      </div>

      <QuizEditor courseId={id} quizId={quizId} />
    </div>
  );
}

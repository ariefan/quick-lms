import { QuizBuilder } from "@/components/course/quiz-builder";

export default async function NewQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Quiz</h1>
        <p className="mt-2 text-gray-600">
          Build a quiz with multiple question types and configure grading settings.
        </p>
      </div>

      <QuizBuilder courseId={id} />
    </div>
  );
}

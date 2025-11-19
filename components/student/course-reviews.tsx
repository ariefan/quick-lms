"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface CourseReviewsProps {
  courseId: string;
}

export function CourseReviews({ courseId }: CourseReviewsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  const { data: reviews, refetch } = trpc.student.getCourseReviews.useQuery({ courseId });
  const { data: myReview } = trpc.student.getMyReview.useQuery({ courseId });
  const { data: enrollment } = trpc.student.getEnrollmentStatus.useQuery({ courseId });

  const createReviewMutation = trpc.student.createReview.useMutation({
    onSuccess: () => {
      refetch();
      setShowReviewForm(false);
      setRating(5);
      setContent("");
    },
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    createReviewMutation.mutate({
      courseId,
      rating,
      content: content.trim() || undefined,
    });
  };

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const canReview = enrollment?.enrollment?.status === "active" && !myReview;

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Student Reviews</h2>
          {reviews && reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center">{renderStars(averageRating)}</div>
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)} ({reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {canReview && (
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {showReviewForm ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && canReview && (
        <form onSubmit={handleSubmitReview} className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Write Your Review</h3>

          <div className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium">Rating</label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="text-2xl transition-colors"
                  >
                    {value <= rating ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      <span className="text-gray-300">★</span>
                    )}
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({rating} stars)</span>
              </div>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium">
                Review (optional)
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Share your experience with this course..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={createReviewMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* My Existing Review */}
      {myReview && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Your Review</h4>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  You
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex">{renderStars(myReview.rating)}</div>
                <span className="text-sm text-gray-600">
                  {new Date(myReview.createdAt).toLocaleDateString()}
                </span>
              </div>
              {myReview.content && <p className="mt-2 text-gray-700">{myReview.content}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{review.user.name}</h4>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <span className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.content && <p className="mt-2 text-gray-700">{review.content}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !myReview && (
          <div className="rounded-lg border bg-gray-50 p-8 text-center text-gray-500">
            No reviews yet. {canReview && "Be the first to review this course!"}
          </div>
        )
      )}
    </div>
  );
}

// Helper function to render star ratings
function renderStars(rating: number) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? "text-yellow-400" : "text-gray-300"}>
          ★
        </span>
      ))}
    </>
  );
}

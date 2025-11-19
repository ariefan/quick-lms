"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export function Wishlist() {
  const { data: wishlist, isLoading, refetch } = trpc.student.getMyWishlist.useQuery();

  const removeMutation = trpc.student.removeFromWishlist.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleRemove = (courseId: string) => {
    removeMutation.mutate({ courseId });
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading wishlist...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <p className="mt-1 text-sm text-gray-600">
          Courses you're interested in learning ({wishlist?.length || 0} courses)
        </p>
      </div>

      {wishlist && wishlist.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Your wishlist is empty</h3>
          <p className="mt-2 text-sm text-gray-500">
            Browse our catalog to add courses you're interested in.
          </p>
          <Link
            href="/catalog"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wishlist?.map((item) => (
            <div
              key={item.courseId}
              className="group rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Course Thumbnail */}
              <Link href={`/catalog/${(item.course as any).id}`}>
                <div className="flex h-32 items-center justify-center rounded-t-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  {(item.course as any).thumbnail ? (
                    <img
                      src={(item.course as any).thumbnail}
                      alt={(item.course as any).title}
                      className="h-full w-full rounded-t-lg object-cover"
                    />
                  ) : (
                    <div className="text-4xl text-white opacity-80">📚</div>
                  )}
                </div>
              </Link>

              <div className="p-6 space-y-3">
                {/* Title */}
                <Link href={`/catalog/${(item.course as any).id}`}>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                    {(item.course as any).title}
                  </h3>
                </Link>

                {(item.course as any).shortDescription && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {(item.course as any).shortDescription}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
                    {(item.course as any).level.charAt(0).toUpperCase() + (item.course as any).level.slice(1)}
                  </span>
                  <span>•</span>
                  <span>
                    {(item.course as any).price === "0.00" || (item.course as any).price === "0"
                      ? "Free"
                      : `$${(item.course as any).price}`}
                  </span>
                </div>

                {/* Institution */}
                <div className="text-xs text-gray-500">{(item.course as any).institution.name}</div>

                {/* Actions */}
                <div className="flex gap-2 border-t pt-3">
                  <Link
                    href={`/catalog/${(item.course as any).id}`}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    View Course
                  </Link>
                  <button
                    onClick={() => handleRemove((item.course as any).id)}
                    disabled={removeMutation.isPending}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </div>

                {/* Added date */}
                <div className="text-xs text-gray-500">
                  Added {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

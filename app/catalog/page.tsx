import { CourseCatalog } from "@/components/course/course-catalog";

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <CourseCatalog />
      </div>
    </div>
  );
}

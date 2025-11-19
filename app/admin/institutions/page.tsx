import { InstitutionAdminList } from "@/components/institution/admin-list";

export default function AdminInstitutionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <InstitutionAdminList />
      </div>
    </div>
  );
}

import { InstitutionDashboard } from "@/components/institution/institution-dashboard";

export default function InstitutionPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <InstitutionDashboard institutionId={params.id} />
      </div>
    </div>
  );
}

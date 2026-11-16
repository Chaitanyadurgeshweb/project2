import { LttRunner } from "@/components/LttRunner";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Loco Trails</h1>
        <p className="text-sm text-muted">Trips per loco per date, with make, and a date-wise summary.</p>
      </div>
      <LttRunner />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { AdminPanels } from "@/components/AdminPanels";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getMe();
  if (!me || me.role !== "admin") redirect("/");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <AdminPanels meId={me.id} />
    </div>
  );
}

import Link from "next/link";
import { getMe } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await getMe();
  if (!me) redirect("/login");
  let q = adminClient().from("runs").select("id, tool, status, structure, input_name, created_at").order("created_at", { ascending: false }).limit(5);
  if (me.role !== "admin") q = q.eq("created_by", me.id);
  const { data: runs } = await q;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {me.username}</h1>
        <p className="text-sm text-muted">Pick a tool to start.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/daily-loco-trails" className="card block p-5 transition-shadow hover:shadow-md">
          <h2 className="text-lg font-semibold text-rail">Daily Loco Trails</h2>
          <p className="mt-1 text-sm text-muted">Upload the day folders or one folder per section. Get trips per loco per date, with each loco’s make.</p>
        </Link>
        <Link href="/radtx" className="card block p-5 transition-shadow hover:shadow-md">
          <h2 className="text-lg font-semibold text-rail">RadTx NMS</h2>
          <p className="mt-1 text-sm text-muted">Updates the master sheet with colored trial dates and the MEDHA and other-firm summaries.</p>
        </Link>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Recent runs</h2>
        {runs && runs.length > 0 ? (
          <ul className="card divide-y divide-line">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{r.input_name ?? "Upload"} <span className="text-muted">· {r.tool === "ltt" ? "Daily Loco Trails" : "RadTx"}</span></span>
                <span className="flex items-center gap-3">
                  <span className="text-muted">{new Date(r.created_at).toLocaleString("en-IN")}</span>
                  {r.status === "done" ? <a className="font-medium text-rail hover:underline" href={`/api/runs/${r.id}/download`}>Download</a> : <span className="text-stop">Failed</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No runs yet.</p>
        )}
      </section>
    </div>
  );
}

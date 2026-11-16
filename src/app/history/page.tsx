import { getMe } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function History() {
  const me = await getMe();
  if (!me) redirect("/login");
  const db = adminClient();
  let q = db.from("runs").select("id, tool, status, structure, input_name, created_at, created_by, error, stats").order("created_at", { ascending: false }).limit(100);
  if (me.role !== "admin") q = q.eq("created_by", me.id);
  const { data: runs } = await q;
  const { data: people } = await db.from("profiles").select("id, username");
  const name = new Map((people ?? []).map((p) => [p.id, p.username]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead><tr>
            <th className="th">When</th><th className="th">Tool</th><th className="th">Input</th>
            {me.role === "admin" && <th className="th">User</th>}<th className="th">Dates</th><th className="th">Result</th>
          </tr></thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                <td className="td">{r.tool === "ltt" ? "Daily Loco Trails" : "RadTx"}</td>
                <td className="td">{r.input_name ?? "—"}{r.structure ? <span className="text-muted"> · Structure {r.structure}</span> : null}</td>
                {me.role === "admin" && <td className="td">{name.get(r.created_by) ?? "—"}</td>}
                <td className="td">{(r.stats?.dates as string[] | undefined)?.join(", ") ?? "—"}</td>
                <td className="td">{r.status === "done" ? <a className="font-medium text-rail hover:underline" href={`/api/runs/${r.id}/download`}>Download</a> : <span className="text-stop" title={r.error ?? ""}>Failed</span>}</td>
              </tr>
            ))}
            {(!runs || runs.length === 0) && <tr><td className="td text-muted" colSpan={6}>No runs yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Uploaded input files are deleted after each run; only the generated Excel is kept.</p>
    </div>
  );
}

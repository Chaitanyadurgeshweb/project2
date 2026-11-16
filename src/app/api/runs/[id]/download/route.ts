import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { HttpError, requireMe } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const me = await requireMe();
    const db = adminClient();
    const { data: run } = await db.from("runs").select("created_by, output_path, tool, stats").eq("id", params.id).single();
    if (!run || !run.output_path) throw new HttpError(404, "Run not found");
    if (run.created_by !== me.id && me.role !== "admin") throw new HttpError(403, "Not your run");
    const dates: string[] = run.stats?.dates ?? [];
    const label = dates.length ? `${dates[0]}${dates.length > 1 ? `_to_${dates[dates.length - 1]}` : ""}`.replace(/\//g, "-") : params.id.slice(0, 8);
    const name = `${run.tool === "ltt" ? "Loco_trails" : "RadTx"}_${label}.xlsx`;
    const { data, error } = await db.storage.from("outputs").createSignedUrl(run.output_path, 60, { download: name });
    if (error || !data) throw new HttpError(404, "Output file is no longer available");
    return NextResponse.redirect(data.signedUrl);
  });
}

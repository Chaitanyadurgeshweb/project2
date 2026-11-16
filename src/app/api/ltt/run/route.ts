import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { HttpError, requireMe } from "@/lib/auth";
import { runLtt } from "@/lib/ltt";
import { getSetting, loadMakes } from "@/lib/makes";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireMe();
    const { path, name } = (await req.json()) as { path?: string; name?: string };
    if (!path || !path.startsWith(`${me.id}/`)) throw new HttpError(400, "Invalid upload reference");
    const db = adminClient();

    const { data: file, error: dlErr } = await db.storage.from("uploads").download(path);
    if (dlErr || !file) throw new HttpError(400, "The uploaded file could not be found. Please upload again.");
    const input = new Uint8Array(await file.arrayBuffer());

    const [makes, primaryMake] = await Promise.all([loadMakes(), getSetting<string>("primary_make", "MEDHA")]);
    const runId = crypto.randomUUID();
    try {
      const result = await runLtt(input, { makeOf: makes.makeOf, primaryMake });
      const outPath = `${me.id}/${runId}.xlsx`;
      const up = await db.storage.from("outputs").upload(outPath, result.workbook, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (up.error) throw new Error(up.error.message);
      await db.from("runs").insert({
        id: runId, tool: "ltt", created_by: me.id, status: "done", structure: result.structure,
        input_name: name ?? null, output_path: outPath, make_source: makes.source,
        stats: result.stats, skipped: result.skipped, warnings: result.warnings,
      });
      return NextResponse.json({
        id: runId, primaryMake, structure: result.structure, stats: result.stats, skipped: result.skipped,
        warnings: result.warnings, makeSource: makes.source, makesFetchedAt: makes.fetchedAt,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Processing failed";
      await db.from("runs").insert({ id: runId, tool: "ltt", created_by: me.id, status: "failed", input_name: name ?? null, error: message, make_source: makes.source });
      throw new HttpError(422, message);
    } finally {
      await db.storage.from("uploads").remove([path]); // the input is not kept
    }
  });
}

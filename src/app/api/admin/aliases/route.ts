import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { HttpError, requireAdmin } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const { data } = await adminClient().from("make_aliases").select("alias, canonical").order("canonical").order("alias");
    return NextResponse.json({ aliases: data ?? [] });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const b = (await req.json()) as { alias?: string; canonical?: string };
    const alias = (b.alias ?? "").trim().toUpperCase();
    const canonical = (b.canonical ?? "").trim().toUpperCase();
    if (!alias || !canonical) throw new HttpError(400, "Both the name and the make it maps to are required");
    const { error } = await adminClient().from("make_aliases").upsert({ alias, canonical });
    if (error) throw new HttpError(400, error.message);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const alias = new URL(req.url).searchParams.get("alias");
    if (!alias) throw new HttpError(400, "Missing alias");
    await adminClient().from("make_aliases").delete().eq("alias", alias);
    return NextResponse.json({ ok: true });
  });
}

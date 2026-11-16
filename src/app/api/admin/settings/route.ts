import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { HttpError, requireAdmin, requireMe } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export async function GET() {
  return handle(async () => {
    await requireMe();
    const { data } = await adminClient().from("settings").select("key, value");
    return NextResponse.json({ settings: Object.fromEntries((data ?? []).map((s) => [s.key, s.value])) });
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const b = (await req.json()) as { primary_make?: string };
    const make = (b.primary_make ?? "").trim().toUpperCase();
    if (!make) throw new HttpError(400, "Company name cannot be empty");
    await adminClient().from("settings").upsert({ key: "primary_make", value: make });
    return NextResponse.json({ ok: true });
  });
}

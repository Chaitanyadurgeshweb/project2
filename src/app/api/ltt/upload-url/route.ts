import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireMe } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

/** Gives the browser a one-time URL to upload the ZIP straight to storage (avoids Vercel's request size limit). */
export async function POST() {
  return handle(async () => {
    const me = await requireMe();
    const path = `${me.id}/${Date.now()}-${crypto.randomUUID()}.zip`;
    const { data, error } = await adminClient().storage.from("uploads").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return NextResponse.json({ path, token: data.token });
  });
}

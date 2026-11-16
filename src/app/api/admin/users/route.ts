import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { HttpError, requireAdmin } from "@/lib/auth";
import { usernameToEmail } from "@/lib/username";
import { adminClient } from "@/lib/supabase/admin";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const { data } = await adminClient().from("profiles").select("id, username, full_name, role, active, created_at").order("created_at");
    return NextResponse.json({ users: data ?? [] });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const b = (await req.json()) as { username?: string; password?: string; full_name?: string; role?: string };
    const username = (b.username ?? "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new HttpError(400, "Username: 3-30 letters, numbers, dot, dash or underscore");
    if (!b.password || b.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
    const role = b.role === "admin" ? "admin" : "user";
    const db = adminClient();
    const { data, error } = await db.auth.admin.createUser({ email: usernameToEmail(username), password: b.password, email_confirm: true });
    if (error || !data.user) throw new HttpError(400, error?.message.includes("already") ? "That username already exists" : error?.message ?? "Could not create user");
    const { error: pe } = await db.from("profiles").insert({ id: data.user.id, username, full_name: b.full_name ?? null, role });
    if (pe) {
      await db.auth.admin.deleteUser(data.user.id);
      throw new HttpError(400, pe.message);
    }
    return NextResponse.json({ ok: true });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const me = await requireAdmin();
    const b = (await req.json()) as { id?: string; password?: string; active?: boolean; role?: string };
    if (!b.id) throw new HttpError(400, "Missing user id");
    const db = adminClient();
    if (b.id === me.id && (b.active === false || b.role === "user")) throw new HttpError(400, "You cannot deactivate or demote yourself");
    if (b.password !== undefined) {
      if (b.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
      const { error } = await db.auth.admin.updateUserById(b.id, { password: b.password });
      if (error) throw new HttpError(400, error.message);
    }
    const patch: Record<string, unknown> = {};
    if (typeof b.active === "boolean") patch.active = b.active;
    if (b.role === "admin" || b.role === "user") patch.role = b.role;
    if (Object.keys(patch).length) {
      const { error } = await db.from("profiles").update(patch).eq("id", b.id);
      if (error) throw new HttpError(400, error.message);
      if (patch.active === false) await db.auth.admin.signOut(b.id).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  });
}

import { adminClient } from "./supabase/admin";
import { serverClient } from "./supabase/server";

export interface Me {
  id: string;
  username: string;
  role: "admin" | "user";
}

export { usernameToEmail } from "./username";

export async function getMe(): Promise<Me | null> {
  const { data } = await serverClient().auth.getUser();
  if (!data.user) return null;
  const { data: p } = await adminClient().from("profiles").select("id, username, role, active").eq("id", data.user.id).single();
  if (!p || !p.active) return null;
  return { id: p.id, username: p.username, role: p.role };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) throw new HttpError(401, "Not signed in");
  return me;
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireMe();
  if (me.role !== "admin") throw new HttpError(403, "Admin only");
  return me;
}

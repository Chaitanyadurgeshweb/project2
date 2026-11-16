import { Pool } from "pg";
import { adminClient } from "./supabase/admin";

export interface MakeLookup {
  makeOf: (loco: string) => string | undefined;
  source: "portal" | "cache";
  fetchedAt: string;
  count: number;
}

let pool: Pool | null = null;
function portalPool(): Pool {
  if (!process.env.PORTAL_DATABASE_URL) throw new Error("PORTAL_DATABASE_URL is not set");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.PORTAL_DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 8000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function loadAliases(): Promise<Map<string, string>> {
  const { data } = await adminClient().from("make_aliases").select("alias, canonical");
  return new Map((data ?? []).map((a) => [a.alias.toUpperCase(), a.canonical]));
}

export function canonicalMake(raw: string, aliases: Map<string, string>): string {
  const key = raw.trim().toUpperCase();
  return aliases.get(key) ?? key;
}

/** Reads the make of every loco from the portal view. Falls back to the last saved copy if the portal is unreachable. */
export async function loadMakes(): Promise<MakeLookup> {
  const db = adminClient();
  const aliases = await loadAliases();
  let map: Record<string, string> | null = null;
  let source: "portal" | "cache" = "portal";
  let fetchedAt = new Date().toISOString();

  try {
    const res = await portalPool().query<{ loco_id: string; make: string }>(
      "select loco_id, make from tool_export.loco_makes where make is not null"
    );
    map = {};
    for (const r of res.rows) map[String(r.loco_id).trim()] = canonicalMake(r.make, aliases);
    if (Object.keys(map).length === 0) throw new Error("Portal returned no makes");
    await db.from("make_cache").upsert({ id: 1, fetched_at: fetchedAt, data: map });
  } catch (err) {
    console.error("Portal make lookup failed, using saved copy:", err);
    const { data } = await db.from("make_cache").select("fetched_at, data").eq("id", 1).maybeSingle();
    if (!data) throw new Error("The loco portal could not be reached and there is no saved copy of the makes yet.");
    map = data.data as Record<string, string>;
    // Re-apply aliases so edits to the alias table also affect the saved copy.
    for (const k of Object.keys(map)) map[k] = canonicalMake(map[k], aliases);
    source = "cache";
    fetchedAt = data.fetched_at;
  }
  const final = map;
  return { makeOf: (l) => final[l], source, fetchedAt, count: Object.keys(final).length };
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await adminClient().from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

/**
 * Creates the first admin account.
 *   npx tsx --env-file=.env.local scripts/create-admin.ts <username> <password>
 */
import { createClient } from "@supabase/supabase-js";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error("Usage: create-admin.ts <username> <password (8+ characters)>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }

(async () => {
  const db = createClient(url, key, { auth: { persistSession: false } });
  const email = `${username.trim().toLowerCase()}@chaitu.local`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) { console.error("Could not create the user:", error?.message); process.exit(1); }
  const { error: pe } = await db.from("profiles").insert({ id: data.user.id, username: username.trim().toLowerCase(), role: "admin" });
  if (pe) { await db.auth.admin.deleteUser(data.user.id); console.error("Could not create the profile:", pe.message); process.exit(1); }
  console.log(`Admin "${username}" created. You can sign in now.`);
})();

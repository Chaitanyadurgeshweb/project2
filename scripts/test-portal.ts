/**
 * Checks the connection to the loco portal and the make data.
 *   npx tsx --env-file=.env.local scripts/test-portal.ts
 */
import { Pool } from "pg";

const url = process.env.PORTAL_DATABASE_URL;
if (!url) {
  console.error("PORTAL_DATABASE_URL is missing in .env.local");
  process.exit(1);
}

(async () => {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 8000, ssl: { rejectUnauthorized: false } });
  try {
    const total = await pool.query("select count(*)::int as n from tool_export.loco_makes");
    console.log(`Connected. ${total.rows[0].n} locos with a make in the portal.`);
    const byMake = await pool.query("select make, count(*)::int as locos from tool_export.loco_makes group by make order by locos desc");
    console.table(byMake.rows);
    const sample = await pool.query("select loco_id, make from tool_export.loco_makes order by loco_id::int limit 5");
    console.table(sample.rows);
  } catch (e) {
    console.error("Could not read the portal:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

# Loco Trial Tools

One web app with two tools behind a login: **Daily Loco Trails** (built) and **RadTx NMS** (next phase).
Next.js 14 on Vercel, a new Supabase project for the app, and a read-only link to the loco portal's Supabase for makes.

## What is built
- Login with admin-created usernames and passwords (admin / user roles), history of runs, admin screens for users, make-name aliases and the company that gets its own column.
- **Daily Loco Trails**: upload a ZIP or a folder. The layout is detected automatically:
  - **A**: date folders (e.g. `29.10.26`) > section > loco folders > files. Logic unchanged.
  - **B**: section > loco folders > files with several dates. Rows that run past midnight are split at 00:00:00, which turns B into A, then the A logic runs.
  - Zero-start rule (00:00:00 to 00:00:06): the loco + direction + date is removed in every section. Trips are counted per loco per date.
  - Output workbook: Loco Details, Loco Trip Details, Date Wise Summary, Not Found Locos. Skipped files are listed on screen with reasons.
- Verified on your samples: both structures give a workbook identical to your `Loco_trails.xlsx` for the first three sheets.
- RadTx NMS: page placeholder only. The `sections` and `stations` tables (from your Station list) are already in the database for it.

## Setup
1. **New Supabase project** > SQL Editor: run `supabase/schema.sql`, then `supabase/seed_stations.sql`.
2. Copy `.env.example` to `.env.local` and fill it in:
   - the new project's URL, anon key and service-role key (Project Settings > API),
   - `PORTAL_DATABASE_URL`: the loco portal's pooler connection string (Connect > Transaction pooler) using the `tool_reader` role and its password.
3. `npm install`, then check the portal link: `npx tsx --env-file=.env.local scripts/test-portal.ts`
4. First admin: `npx tsx --env-file=.env.local scripts/create-admin.ts <username> <password>`
5. `npm run dev` and open http://localhost:3000

## Deploy on Vercel (direct, no GitHub)
1. `npm i -g vercel` then `vercel login`
2. In this folder run `vercel` and answer the prompts (new project, framework Next.js is detected).
3. In Vercel > Project > Settings > Environment Variables add the four variables from `.env.example` (Production). `.env.local` is not uploaded.
4. `vercel --prod`
`vercel.json` runs the functions in Mumbai (`bom1`), close to the Supabase database. Alternatively push the folder to GitHub and import it in Vercel.
The run endpoint is set to a 60 second limit (`maxDuration` in `src/app/api/ltt/run/route.ts`); your samples take about 2 seconds.

## Notes
- Uploaded input files are deleted after each run; only the generated Excel is kept (Storage bucket `outputs`).
- If the portal is unreachable, the last saved copy of the makes is used and the result screen says so.
- Make names are merged through the alias table (Admin > Make names). Loco IDs with no make in the portal show as "Not Found".
- `scripts/test-ltt.ts` is the comparison test used during development (it reads the sample files from `/mnt/user-data/uploads`; edit the paths to reuse it).
- The `xlsx` package from npm (0.18.5) reads the uploaded `.xls` files. It is fine for files from your own team; do not open it to anonymous uploads.

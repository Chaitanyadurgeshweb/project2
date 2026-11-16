import fs from "node:fs";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { runLtt } from "../src/lib/ltt";

const UP = "/mnt/user-data/uploads/";
const ZIP_A = UP + "1794481003817_STRUCTURE_A.zip";
const ZIP_B = UP + "1794481003818_structure_b.zip";
const COMPANY = UP + "1794480730389_company_list.xls";
const EXPECTED = UP + "1794480739470_Loco_trails.xlsx";

// Test make map from the old company list (production reads the portal view instead).
const ALIAS: Record<string, string> = { MEDHA: "MEDHA", GTRONICS: "GGTRONICS" };
const wb = XLSX.read(fs.readFileSync(COMPANY), { type: "buffer" });
const sheetRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
const makes = new Map<string, string>();
for (const r of sheetRows.slice(1)) {
  if (r[2] === undefined || r[2] === null) continue;
  const id = String(Math.trunc(Number(r[2])));
  const raw = String(r[1]).trim().toUpperCase();
  if (!makes.has(id)) makes.set(id, ALIAS[raw] ?? raw);
}
const opts = { makeOf: (l: string) => makes.get(l), primaryMake: "MEDHA" };

async function dump(buf: Uint8Array | string) {
  const w = new ExcelJS.Workbook();
  if (typeof buf === "string") await w.xlsx.readFile(buf);
  else await w.xlsx.load(Buffer.from(buf) as any);
  const out: Record<string, (string | number | null)[][]> = {};
  w.eachSheet((ws) => {
    const rows: (string | number | null)[][] = [];
    const maxRow = Math.min(ws.rowCount, 400), maxCol = 15;
    for (let r = 1; r <= maxRow; r++) {
      const vals: (string | number | null)[] = [];
      for (let c = 1; c <= maxCol; c++) {
        const v = ws.getCell(r, c).value as any;
        vals.push(v === null || v === undefined ? null : typeof v === "object" ? String(v.result ?? v.text ?? "") : v);
      }
      rows.push(vals);
    }
    // drop trailing fully-empty rows so row counts are comparable
    while (rows.length && rows[rows.length - 1].every((v) => v === null)) rows.pop();
    out[ws.name] = rows;
  });
  return out;
}

function compare(name: string, got: any[][], exp: any[][]) {
  let diffs = 0;
  const n = Math.max(got.length, exp.length);
  for (let r = 0; r < n; r++) {
    const g = got[r] ?? [], e = exp[r] ?? [];
    const w = Math.max(g.length, e.length);
    for (let c = 0; c < w; c++) {
      const gv = g[c] ?? null, ev = e[c] ?? null;
      if (String(gv) !== String(ev)) {
        if (diffs < 5) console.log(`   diff ${name} r${r + 1}c${c + 1}: got=${gv} expected=${ev}`);
        diffs++;
      }
    }
  }
  console.log(`  ${name}: ${diffs === 0 ? "IDENTICAL" : diffs + " cell differences"} (${got.length} rows)`);
  return diffs;
}

(async () => {
  const expected = await dump(EXPECTED);
  for (const [label, path] of [["Structure A", ZIP_A], ["Structure B", ZIP_B]] as const) {
    const res = await runLtt(new Uint8Array(fs.readFileSync(path)), opts);
    console.log(`\n== ${label}: detected ${res.structure}; files read ${res.stats.filesRead}; rows ${res.stats.rowsRead}; split at midnight ${res.stats.rowsSplitAtMidnight}; zero-start removed ${res.stats.zeroStartRemoved}`);
    console.log("   skipped:", res.skipped.length, "warnings:", res.warnings.length, "sections:", res.stats.sections.join(","));
    console.log("   summary:", JSON.stringify(res.stats.summary));
    const got = await dump(res.workbook);
    for (const sheet of ["Loco Details", "Loco Trip Details", "Date Wise Summary"]) compare(sheet, got[sheet], expected[sheet]);
    console.log("  Not Found Locos (new layout):", JSON.stringify(res.stats.notFound));
    fs.writeFileSync(`/home/claude/out_${res.structure}_${label.slice(-1)}.xlsx`, res.workbook);
  }
})();

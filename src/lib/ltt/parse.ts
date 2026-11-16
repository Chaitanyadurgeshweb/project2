import * as XLSX from "xlsx";
import { parseDateTime, dateKey } from "./datetime";
import type { FileEntry, TrialRow } from "./types";

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Exact header match first, then "starts with"; mirrors the existing find_column idea. */
function findColumn(headers: string[], options: string[], allowContains = false): number {
  for (const o of options) {
    const i = headers.findIndex((h) => h === o);
    if (i >= 0) return i;
  }
  for (const o of options) {
    const i = headers.findIndex((h) => h.startsWith(o));
    if (i >= 0) return i;
  }
  if (allowContains) {
    for (const o of options) {
      const i = headers.findIndex((h) => h.includes(o));
      if (i >= 0) return i;
    }
  }
  return -1;
}

function cleanLoco(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v).replace(/\.0+$/, "");
  return String(v).trim().replace(/\.0+$/, "");
}

export class ParseError extends Error {}

/** Parses one trial workbook. Throws ParseError with a readable reason when it cannot be used. */
export function parseTrialFile(file: FileEntry, section: string): TrialRow[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(file.data, { type: "array", cellDates: true });
  } catch {
    throw new ParseError("File could not be opened (corrupt or not a real Excel file)");
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new ParseError("Workbook has no sheets");
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  let headerRow = -1;
  let cols = { loco: -1, dir: -1, from: -1, to: -1, date: -1 };
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const headers = (grid[r] ?? []).map(norm);
    const loco = findColumn(headers, ["locoid", "loco", "locono", "locomotiveid"], true);
    const dir = findColumn(headers, ["direction", "dir"]);
    if (loco >= 0 && dir >= 0) {
      headerRow = r;
      cols = {
        loco, dir,
        from: findColumn(headers, ["from", "fromtime", "starttime"]),
        to: findColumn(headers, ["to", "totime", "endtime"]),
        date: findColumn(headers, ["date"]),
      };
      break;
    }
  }
  if (headerRow < 0) throw new ParseError("No header row with Loco Id and Direction found");
  if (cols.from < 0 && cols.date < 0) throw new ParseError("No From or Date column found");

  const rows: TrialRow[] = [];
  let curLoco = "";
  let curDir = "";
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const loco = cleanLoco(row[cols.loco]);
    const dir = String(row[cols.dir] ?? "").trim();
    if (loco) curLoco = loco;
    if (dir) curDir = dir;
    if (!curLoco || !curDir) continue;
    const from = cols.from >= 0 ? parseDateTime(row[cols.from]) : null;
    const to = cols.to >= 0 ? parseDateTime(row[cols.to]) : null;
    let dateText = "";
    if (cols.date >= 0 && row[cols.date] !== null && row[cols.date] !== "") {
      const t = parseDateTime(row[cols.date]);
      dateText = t !== null ? dateKey(t) : String(row[cols.date]).trim();
    }
    if (from === null && !dateText) continue; // nothing to place this row on a date
    rows.push({ section, loco: curLoco, direction: curDir.slice(0, 3).toUpperCase(), from, to, dateText, file: file.path });
  }
  return rows;
}

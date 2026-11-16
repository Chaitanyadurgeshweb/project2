import { DAY_MS, dateKey, dateSortValue, secondsOfDay, startOfDay } from "./datetime";
import type { DetailRow, LttOptions, TrialRow, TripRow } from "./types";

/**
 * Structure B -> Structure A: a row that runs past midnight is cut at 00:00:00,
 * which is how the daily files of Structure A look.
 */
export function splitAtMidnight(rows: TrialRow[]): { rows: TrialRow[]; splits: number } {
  const out: TrialRow[] = [];
  let splits = 0;
  for (const r of rows) {
    if (r.from === null || r.to === null || startOfDay(r.from) === startOfDay(r.to)) {
      out.push(r);
      continue;
    }
    splits++;
    let cursor = r.from;
    let day = startOfDay(r.from);
    const lastDay = startOfDay(r.to);
    while (day < lastDay) {
      out.push({ ...r, from: cursor, to: day + DAY_MS - 1000, dateText: "" });
      day += DAY_MS;
      cursor = day;
    }
    out.push({ ...r, from: cursor, to: r.to, dateText: "" });
  }
  return { rows: out, splits };
}

const isZeroStart = (t: number | null) => t !== null && secondsOfDay(t) <= 6; // 00:00:00 - 00:00:06
const rowDate = (r: TrialRow) => r.dateText || (r.from !== null ? dateKey(r.from) : "");
const locoSort = (a: string, b: string) => {
  const na = Number(a), nb = Number(b);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
};

export interface Processed {
  details: DetailRow[]; // after zero-start removal
  zeroStartRemoved: number;
  trips: TripRow[];
  dates: string[];
  sections: string[];
  summary: { date: string; totalTrips: number; primaryTrips: number; otherTrips: number }[];
  notFound: { date: string; loco: string; trips: number }[];
}

export function processRows(rows: TrialRow[], opts: LttOptions): Processed {
  // Loco Details: one record per section + loco + direction + date.
  const seen = new Map<string, DetailRow>();
  const zeroKeys = new Set<string>();
  for (const r of rows) {
    const date = rowDate(r);
    if (!date) continue;
    const key = `${r.section}|${r.loco}|${r.direction}|${date}`;
    if (!seen.has(key)) seen.set(key, { section: r.section, loco: r.loco, direction: r.direction, date });
    if (isZeroStart(r.from)) zeroKeys.add(`${r.loco}|${r.direction}|${date}`);
  }

  // Zero-start trips are removed for that loco + direction + date in every section.
  const details = [...seen.values()].filter((d) => !zeroKeys.has(`${d.loco}|${d.direction}|${d.date}`));
  const zeroStartRemoved = seen.size - details.length;

  // Trips = distinct directions per loco per date.
  const dirs = new Map<string, Set<string>>();
  for (const d of details) {
    const k = `${d.date}|${d.loco}`;
    if (!dirs.has(k)) dirs.set(k, new Set());
    dirs.get(k)!.add(d.direction);
  }
  const trips: TripRow[] = [];
  for (const [k, set] of dirs) {
    const [date, loco] = k.split("|");
    trips.push({ date, loco, trips: set.size, make: opts.makeOf(loco) ?? "Not Found" });
  }
  trips.sort((a, b) => dateSortValue(a.date) - dateSortValue(b.date) || locoSort(a.loco, b.loco));

  const dates = [...new Set(trips.map((t) => t.date))].sort((a, b) => dateSortValue(a) - dateSortValue(b));
  const sections = [...new Set(details.map((d) => d.section))].sort();
  const primary = opts.primaryMake.trim().toUpperCase();
  const summary = dates.map((date) => {
    const day = trips.filter((t) => t.date === date);
    const totalTrips = day.reduce((s, t) => s + t.trips, 0);
    const primaryTrips = day.filter((t) => t.make.toUpperCase() === primary).reduce((s, t) => s + t.trips, 0);
    return { date, totalTrips, primaryTrips, otherTrips: totalTrips - primaryTrips };
  });
  const notFound = trips.filter((t) => t.make === "Not Found").map((t) => ({ date: t.date, loco: t.loco, trips: t.trips }));
  return { details, zeroStartRemoved, trips, dates, sections, summary, notFound };
}

export { locoSort };

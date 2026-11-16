const pad = (n: number) => String(n).padStart(2, "0");

/** Build a wall-clock timestamp as UTC epoch ms (no timezone shifts). */
export function ts(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/** Accepts Date objects and the string layouts used by the existing tools. */
export function parseDateTime(value: unknown): number | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    // Server runs in UTC, so UTC getters give the wall-clock value.
    return ts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(),
      value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds());
  }
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  // 2026-10-29 15:27:08  or ISO 2026-10-29T15:27:08
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return ts(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));

  // 29/10/26 15:27:08  or 29/10/2026 15:27:08
  m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return ts(fullYear(+m[3]), +m[2], +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return null;
}

export function dateKey(t: number): string {
  const d = new Date(t);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCFullYear() % 100)}`;
}

/** dd/mm/yy -> sortable number */
export function dateSortValue(key: string): number {
  const [d, m, y] = key.split("/").map(Number);
  return (2000 + y) * 10000 + m * 100 + d;
}

export function secondsOfDay(t: number): number {
  const d = new Date(t);
  return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export const DAY_MS = 86_400_000;

/** Folder names such as 29.10.26 */
export function parseFolderDate(name: string): string | null {
  const m = name.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!m) return null;
  return `${pad(+m[1])}/${pad(+m[2])}/${pad(fullYear(+m[3]) % 100)}`;
}

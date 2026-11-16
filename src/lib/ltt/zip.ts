import JSZip from "jszip";
import type { FileEntry, SkippedFile } from "./types";

const EXCEL = /\.(xls|xlsx|xlsm)$/i;

/** Reads a ZIP of the main folder. A single wrapper folder inside the ZIP is removed. */
export async function readZip(buffer: Uint8Array): Promise<{ files: FileEntry[]; ignored: SkippedFile[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const ignored: SkippedFile[] = [];
  const kept: string[] = [];
  for (const n of names) {
    const base = n.split("/").pop() ?? n;
    if (n.startsWith("__MACOSX/") || base.startsWith("~$") || base.startsWith(".")) continue;
    if (!EXCEL.test(base)) {
      ignored.push({ path: n, reason: "Not an Excel file (.xls, .xlsx, .xlsm)" });
      continue;
    }
    kept.push(n);
  }

  // Remove a single common wrapper folder (e.g. "STRUCTURE A/").
  const firstParts = new Set(kept.map((n) => n.split("/")[0]));
  const allNested = kept.every((n) => n.includes("/"));
  const strip = allNested && firstParts.size === 1 ? `${[...firstParts][0]}/` : "";

  const files: FileEntry[] = [];
  for (const n of kept) {
    const data = await zip.files[n].async("uint8array");
    files.push({ path: strip ? n.slice(strip.length) : n, data });
  }
  return { files, ignored };
}

import { detectStructure } from "./detect";
import { ParseError, parseTrialFile } from "./parse";
import { processRows, splitAtMidnight } from "./process";
import { buildWorkbook } from "./report";
import { dateKey, parseFolderDate } from "./datetime";
import { readZip } from "./zip";
import type { FileEntry, LttOptions, LttResult, SkippedFile, TrialRow } from "./types";

export type { LttOptions, LttResult } from "./types";

/** Runs the whole Daily Loco Trails flow on a ZIP of the main folder. */
export async function runLtt(zip: Uint8Array, opts: LttOptions): Promise<LttResult> {
  const { files, ignored } = await readZip(zip);
  return runLttFiles(files, opts, ignored);
}

export async function runLttFiles(files: FileEntry[], opts: LttOptions, ignored: SkippedFile[] = []): Promise<LttResult> {
  if (files.length === 0) throw new Error("The upload has no Excel files.");
  const { structure, placed, unplaced } = detectStructure(files);
  const skipped: SkippedFile[] = [...ignored, ...unplaced];
  const warnings: string[] = [];

  let rows: TrialRow[] = [];
  let filesRead = 0;
  for (const { file, section, folderDate } of placed) {
    try {
      const parsed = parseTrialFile(file, section);
      if (parsed.length === 0) {
        skipped.push({ path: file.path, reason: "No usable rows found" });
        continue;
      }
      filesRead++;
      if (structure === "A" && folderDate) {
        const off = parsed.find((r) => r.from !== null && dateKey(r.from) !== folderDate);
        if (off) warnings.push(`${file.path}: contains rows dated ${dateKey(off.from!)} inside date folder ${folderDate}`);
      }
      rows = rows.concat(parsed);
    } catch (e) {
      skipped.push({ path: file.path, reason: e instanceof ParseError ? e.message : "Unexpected error while reading" });
    }
  }
  if (rows.length === 0) throw new Error("No usable rows were found in any file. Check the skipped-files list.");

  const rowsRead = rows.length;
  let splits = 0;
  if (structure === "B") {
    const s = splitAtMidnight(rows);
    rows = s.rows;
    splits = s.splits;
  }

  const processed = processRows(rows, opts);
  const workbook = await buildWorkbook(processed);
  void parseFolderDate;
  return {
    structure,
    workbook,
    skipped,
    warnings: warnings.slice(0, 20),
    stats: {
      filesRead,
      rowsRead,
      rowsSplitAtMidnight: splits,
      zeroStartRemoved: processed.zeroStartRemoved,
      dates: processed.dates,
      sections: processed.sections,
      summary: processed.summary,
      notFound: processed.notFound,
    },
  };
}

import { parseFolderDate } from "./datetime";
import type { FileEntry, Structure } from "./types";

export interface Detected {
  structure: Structure;
  /** file path -> section name (and folder date for structure A) */
  placed: { file: FileEntry; section: string; folderDate: string | null }[];
  unplaced: { path: string; reason: string }[];
}

/**
 * A: main folder > date folders (e.g. 29.10.26) > section > ... > files
 * B: main folder > section > ... > files
 */
export function detectStructure(files: FileEntry[]): Detected {
  const firstLevel = new Set(files.filter((f) => f.path.includes("/")).map((f) => f.path.split("/")[0]));
  if (firstLevel.size === 0) throw new Error("No section folders found. Upload the main folder (or a ZIP of it).");
  const dateFolders = [...firstLevel].filter((n) => parseFolderDate(n) !== null);
  if (dateFolders.length > 0 && dateFolders.length < firstLevel.size) {
    const others = [...firstLevel].filter((n) => parseFolderDate(n) === null).slice(0, 3).join(", ");
    throw new Error(`Mixed folder layout: some first-level folders are dates and some are not (${others}). Upload one structure at a time.`);
  }
  const structure: Structure = dateFolders.length > 0 ? "A" : "B";
  const placed: Detected["placed"] = [];
  const unplaced: Detected["unplaced"] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    if (structure === "A") {
      if (parts.length < 3) {
        unplaced.push({ path: file.path, reason: "Not inside a date folder and a section folder" });
        continue;
      }
      placed.push({ file, section: parts[1], folderDate: parseFolderDate(parts[0]) });
    } else {
      if (parts.length < 2) {
        unplaced.push({ path: file.path, reason: "Not inside a section folder" });
        continue;
      }
      placed.push({ file, section: parts[0], folderDate: null });
    }
  }
  return { structure, placed, unplaced };
}

export type Direction = string; // first three letters, upper case: NOM, REV

/** One parsed data row from a trial file. Times are UTC epoch ms holding the wall-clock value. */
export interface TrialRow {
  section: string;
  loco: string;
  direction: Direction;
  from: number | null;
  to: number | null;
  dateText: string; // dd/mm/yy taken from a Date column when present
  file: string;
}

export interface FileEntry {
  path: string; // path inside the main folder, "/" separated
  data: Uint8Array;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export type Structure = "A" | "B";

export interface DetailRow {
  section: string;
  loco: string;
  direction: Direction;
  date: string; // dd/mm/yy
}

export interface TripRow {
  date: string;
  loco: string;
  trips: number;
  make: string;
}

export interface LttOptions {
  /** Returns the canonical make for a loco, or undefined when unknown. */
  makeOf: (loco: string) => string | undefined;
  /** Make that gets its own column in the summary (editable in settings). */
  primaryMake: string;
}

export interface LttResult {
  structure: Structure;
  workbook: Uint8Array;
  skipped: SkippedFile[];
  warnings: string[];
  stats: {
    filesRead: number;
    rowsRead: number;
    rowsSplitAtMidnight: number;
    zeroStartRemoved: number;
    dates: string[];
    sections: string[];
    summary: { date: string; totalTrips: number; primaryTrips: number; otherTrips: number }[];
    notFound: { date: string; loco: string; trips: number }[];
  };
}

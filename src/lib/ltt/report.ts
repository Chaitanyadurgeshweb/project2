import ExcelJS from "exceljs";
import { locoSort, type Processed } from "./process";

const FONT = { name: "Arial", size: 10 };
const THIN = { style: "thin" as const };
const BORDER = { left: THIN, right: THIN, top: THIN, bottom: THIN };
const CENTER = { horizontal: "center" as const, vertical: "middle" as const };
const YELLOW = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
const PURPLE = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF800080" } };
const GAP = 3; // blank rows between dates

function header(cell: ExcelJS.Cell, text: string, fill = YELLOW, color = "FF000000") {
  cell.value = text;
  cell.font = { ...FONT, bold: true, color: { argb: color } };
  cell.fill = fill;
  cell.alignment = CENTER;
  cell.border = BORDER;
}

function body(cell: ExcelJS.Cell, value: string | number) {
  cell.value = value;
  cell.font = { ...FONT, color: { argb: "FF000000" } };
  cell.alignment = CENTER;
  cell.border = BORDER;
}

export async function buildWorkbook(p: Processed): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chaitu Tools";

  // ---- Loco Details: one block per section, dates stacked top to bottom ----
  const ld = wb.addWorksheet("Loco Details", { views: [{ state: "frozen", ySplit: 2 }] });
  p.sections.forEach((section, i) => {
    const c0 = 1 + i * 5;
    ld.mergeCells(1, c0, 1, c0 + 3);
    header(ld.getCell(1, c0), section, PURPLE, "FFFFFFFF");
    for (let k = 1; k <= 3; k++) {
      const c = ld.getCell(1, c0 + k);
      c.fill = PURPLE; c.border = BORDER;
    }
    ["Loco ID", "Direction", "Date", "Section"].forEach((h, k) => header(ld.getCell(2, c0 + k), h));
    for (let k = 0; k < 4; k++) ld.getColumn(c0 + k).width = 13;
    if (i < p.sections.length - 1) ld.getColumn(c0 + 4).width = 2;
  });
  let row = 3;
  for (const date of p.dates) {
    let maxCount = 0;
    p.sections.forEach((section, i) => {
      const rows = p.details
        .filter((d) => d.date === date && d.section === section)
        .sort((a, b) => locoSort(a.loco, b.loco) || a.direction.localeCompare(b.direction));
      maxCount = Math.max(maxCount, rows.length);
      const c0 = 1 + i * 5;
      rows.forEach((d, k) => {
        body(ld.getCell(row + k, c0), d.loco);
        body(ld.getCell(row + k, c0 + 1), d.direction);
        body(ld.getCell(row + k, c0 + 2), d.date);
        body(ld.getCell(row + k, c0 + 3), d.section);
      });
    });
    row += maxCount + GAP;
  }

  // ---- Loco Trip Details ----
  const td = wb.addWorksheet("Loco Trip Details", { views: [{ state: "frozen", ySplit: 1 }] });
  ["Date ", "Loco ID", "Trips", "Make"].forEach((h, k) => header(td.getCell(1, k + 1), h));
  [14, 12, 10, 16].forEach((w, k) => (td.getColumn(k + 1).width = w));
  row = 2;
  for (const date of p.dates) {
    const day = p.trips.filter((t) => t.date === date);
    day.forEach((t, k) => {
      body(td.getCell(row + k, 1), t.date);
      body(td.getCell(row + k, 2), t.loco);
      body(td.getCell(row + k, 3), t.trips);
      body(td.getCell(row + k, 4), t.make);
    });
    row += day.length + GAP;
  }

  // ---- Date Wise Summary ----
  const ds = wb.addWorksheet("Date Wise Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  ["Date", "Total Trip Count", "Medha Trips", "Other Firms Locos"].forEach((h, k) => header(ds.getCell(1, k + 1), h));
  [18, 18, 14, 20].forEach((w, k) => (ds.getColumn(k + 1).width = w));
  p.summary.forEach((s, k) => {
    body(ds.getCell(k + 2, 1), s.date);
    body(ds.getCell(k + 2, 2), s.totalTrips);
    body(ds.getCell(k + 2, 3), s.primaryTrips);
    body(ds.getCell(k + 2, 4), s.otherTrips);
  });

  // ---- Not Found Locos (locos with no make in the portal data) ----
  const nf = wb.addWorksheet("Not Found Locos", { views: [{ state: "frozen", ySplit: 1 }] });
  ["Date", "Loco Id", "Trip Count"].forEach((h, k) => header(nf.getCell(1, k + 1), h));
  [14, 14, 12].forEach((w, k) => (nf.getColumn(k + 1).width = w));
  row = 2;
  for (const date of p.dates) {
    const day = p.notFound.filter((n) => n.date === date);
    if (day.length === 0) continue;
    day.forEach((n, k) => {
      body(nf.getCell(row + k, 1), n.date);
      body(nf.getCell(row + k, 2), n.loco);
      body(nf.getCell(row + k, 3), n.trips);
    });
    row += day.length + GAP;
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

import type { BarisJadwal, Shift } from "@/app/admin/jadwal/matriks-jadwal";
import { indeksHari, tanggalGeser } from "@/lib/waktu";

/** Kode ringkas untuk tampilan spreadsheet dan file CSV. */
export function kodeShift(nama: string): string {
  const normalized = nama.trim().toLowerCase();
  if (normalized === "pagi") return "P";
  if (normalized === "siang") return "S";
  if (normalized === "full") return "F";
  return nama.trim().slice(0, 1).toUpperCase() || "-";
}

export function shiftByKode(kode: string, shifts: Shift[]): Shift | null {
  const wanted = kode.trim().toUpperCase();
  if (!wanted || wanted === "L" || wanted === "-") return null;
  return shifts.find((s) => kodeShift(s.nama) === wanted) ?? null;
}

/** CSV sederhana dengan delimiter titik koma, aman untuk nama/keterangan. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ";" && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); if (row.some((v) => v.trim())) rows.push(row); }
  return rows;
}

export function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function renderSpreadsheetCsv(
  dates: string[],
  rows: BarisJadwal[],
  shifts: Shift[],
): string {
  const header = ["Karyawan", "Cabang", ...dates];
  const body = rows.map((row) => [
    row.nama,
    row.cabang,
    ...dates.map((date) => {
      const cell = row.hari[dates.indexOf(date)];
      if (!cell) return "L";
      return kodeShift(shifts.find((s) => s.id === cell.shiftId)?.nama ?? "-");
    }),
  ]);
  return "\uFEFF" + [header, ...body].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function datesInMonth(year: number, month: number): string[] {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => tanggalGeser(start, i));
}

export function tanggalPola(pola: string[], date: string): string | null {
  return pola[indeksHari(date)] ?? null;
}

/** Satu sumber transformasi untuk editor dan preview spreadsheet. */
export function updateJadwalCell(
  rows: BarisJadwal[],
  dates: string[],
  userId: string,
  date: string,
  shiftId: string,
  seragamId: string,
  seragamNama: string | null,
): BarisJadwal[] {
  const index = dates.indexOf(date);
  if (index < 0) return rows;
  return rows.map((row) => {
    if (row.userId !== userId) return row;
    const hari = [...row.hari];
    hari[index] = shiftId
      ? { shiftId, seragamId: seragamId || null, seragam: seragamNama }
      : null;
    return { ...row, hari };
  });
}

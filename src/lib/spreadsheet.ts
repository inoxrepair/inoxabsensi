import type { BarisJadwal, Shift } from "@/app/admin/jadwal/matriks-jadwal";
import { indeksHari, tanggalGeser } from "@/lib/waktu";
import { formatTanggalPanjang } from "@/lib/format";

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
  if (!wanted || wanted === "O" || wanted === "L" || wanted === "-") return null;
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
  // Netralisir formula spreadsheet, termasuk yang diawali whitespace.
  const safe = /^[\s]*[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function renderSpreadsheetCsv(
  dates: string[],
  rows: BarisJadwal[],
  shifts: Shift[],
): string {
  const header = ["Karyawan", "Cabang", ...dates.map(formatTanggalPanjang)];
  const body = rows.map((row) => [
    row.nama,
    row.cabang,
    ...dates.map((date) => {
      const cell = row.hari[dates.indexOf(date)];
      if (!cell) return "O";
      return kodeShift(shifts.find((s) => s.id === cell.shiftId)?.nama ?? "-");
    }),
  ]);
  return "\uFEFF" + [header, ...body].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

const BULAN_ID = [
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
];

/**
 * Menerima ISO (yyyy-mm-dd), format tampilan baru dd/mm/yyyy, atau format
 * export lama "28 Juli 2026". Ketiganya dikembalikan sebagai ISO untuk
 * penyimpanan; parser lain yang menerima input pengguna tetap menerima ISO.
 * Format dd/mm/yyyy divalidasi ketat (hari sesuai jumlah hari bulan itu).
 */
export function parseTanggalSpreadsheet(value: string): string | null {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    if (month < 1 || month > 12) return null;
    const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > max) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (!match) return null;
  const month = BULAN_ID.indexOf(match[2].toLowerCase()) + 1;
  if (!month) return null;
  const day = Number(match[1]);
  const year = Number(match[3]);
  const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > max) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

/**
 * Waktu disimpan sebagai menit sejak tengah malam (integer) supaya
 * perhitungan telat dan durasi kerja tidak terpengaruh timezone server.
 */

export const ZONA_WAKTU = "Asia/Makassar";

/** "09.00" atau "09:00" -> 540. Nilai tidak valid menghasilkan null. */
export function keMenit(jam: string): number | null {
  const cocok = /^(\d{1,2})[.:](\d{2})$/.exec(jam.trim());
  if (!cocok) return null;
  const j = Number(cocok[1]);
  const m = Number(cocok[2]);
  if (j > 23 || m > 59) return null;
  return j * 60 + m;
}

/** 540 -> "09.00". Menit di luar satu hari dibungkus (shift lewat tengah malam). */
export function keJam(menit: number): string {
  const total = ((Math.round(menit) % 1440) + 1440) % 1440;
  const j = Math.floor(total / 60);
  return `${String(j).padStart(2, "0")}.${String(total % 60).padStart(2, "0")}`;
}

/** Durasi shift/kerja; menangani shift yang berakhir setelah tengah malam. */
export function durasiMenit(mulai: number, selesai: number): number {
  return selesai >= mulai ? selesai - mulai : selesai + 1440 - mulai;
}

/** Durasi dalam format ringkas "8j 15m". */
export function formatDurasi(menit: number): string {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return m === 0 ? `${j}j` : `${j}j ${m}m`;
}

/** Tanggal lokal "yyyy-mm-dd" pada zona waktu operasional. */
export function tanggalLokal(saat: Date = new Date()): string {
  // en-CA menghasilkan format ISO (yyyy-mm-dd) secara langsung.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WAKTU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(saat);
}

/** Menit sejak tengah malam pada zona waktu operasional. */
export function menitLokal(saat: Date = new Date()): number {
  const [j, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_WAKTU,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(saat)
    .split(":")
    .map(Number);
  return j * 60 + m;
}

/** Menit keterlambatan setelah dikurangi toleransi shift; 0 jika tepat waktu. */
export function menitTelat(
  masuk: number,
  shift: { mulaiMenit: number; toleransiMenit: number },
): number {
  return Math.max(0, masuk - (shift.mulaiMenit + shift.toleransiMenit));
}

/**
 * Menit yang "diampuni" toleransi: bagian keterlambatan kotor yang masih di
 * dalam batas toleransi. 0 bila datang tepat waktu/lebih awal.
 * Contoh shift 08:00 toleransi 10: masuk 08:07 -> 7, masuk 08:12 -> 10.
 */
export function toleransiTerpakai(
  masuk: number,
  shift: { mulaiMenit: number; toleransiMenit: number },
): number {
  const kotor = masuk - shift.mulaiMenit;
  if (kotor <= 0) return 0;
  return Math.min(kotor, shift.toleransiMenit);
}

const SEHARI_MS = 86_400_000;

/** Parse "yyyy-mm-dd" sebagai UTC agar bebas pengaruh timezone runtime. */
function keUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Geser tanggal lokal sejumlah hari; hasil tetap "yyyy-mm-dd". */
export function tanggalGeser(iso: string, hari: number): string {
  return new Date(keUtc(iso) + hari * SEHARI_MS).toISOString().slice(0, 10);
}

/** Indeks hari dengan Senin = 0 … Minggu = 6, selaras HARI_SINGKAT. */
export function indeksHari(iso: string): number {
  return (new Date(keUtc(iso)).getUTCDay() + 6) % 7;
}

/** Tanggal Senin pada minggu yang memuat `iso`. */
export function awalMinggu(iso: string): string {
  return tanggalGeser(iso, -indeksHari(iso));
}

/** Selisih hari (b - a); negatif berarti b lebih awal. */
export function selisihHari(a: string, b: string): number {
  return Math.round((keUtc(b) - keUtc(a)) / SEHARI_MS);
}

const HARI_PANJANG = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

export const HARI_SINGKAT = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
] as const;

export function namaHari(iso: string, singkat = false): string {
  const i = indeksHari(iso);
  return singkat ? HARI_SINGKAT[i] : HARI_PANJANG[i];
}

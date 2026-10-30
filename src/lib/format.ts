/** Helper format tampilan (locale Indonesia). */

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(nilai: number) {
  return RUPIAH.format(nilai);
}

/**
 * Parse tanggal ISO "yyyy-mm-dd" secara ketat (bukan new Date("...") yang
 * longgar). Mengembalikan [tahun, bulan, hari] bila valid, null bila tidak.
 * Menerima hari/bulan 1-2 digit supaya "2026-2-3" tetap bisa diformat.
 */
export function parseTanggalIso(
  iso: string,
): [number, number, number] | null {
  const cocok = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim());
  if (!cocok) return null;
  const y = Number(cocok[1]);
  const m = Number(cocok[2]);
  const d = Number(cocok[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  const cek = new Date(Date.UTC(y, m - 1, d));
  if (
    cek.getUTCFullYear() !== y ||
    cek.getUTCMonth() !== m - 1 ||
    cek.getUTCDate() !== d
  ) {
    return null;
  }
  return [y, m, d];
}

/**
 * Satu-satunya format tanggal yang ditampilkan ke pengguna: dd/mm/yyyy,
 * selalu 2 digit hari dan bulan (01/02/2026). Penyimpanan database tetap
 * yyyy-mm-dd; fungsi ini hanya lapisan tampilan.
 * Tanggal tidak valid dikembalikan apa adanya (fallback aman) agar tidak
 * menampilkan tanggal yang salah.
 */
export function formatTanggal(iso: string): string {
  const parsed = parseTanggalIso(iso);
  if (!parsed) return iso;
  const [y, m, d] = parsed;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Dulu "28 Juli 2026" untuk header spreadsheet/PDF. Kebijakan tampilan
 * sekarang: sama dengan formatTanggal, yaitu dd/mm/yyyy. Nama fungsi
 * dipertahankan supaya import lama tidak pecah; isinya sudah dd/mm/yyyy.
 */
export function formatTanggalPanjang(iso: string): string {
  return formatTanggal(iso);
}

export function formatKoordinat(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

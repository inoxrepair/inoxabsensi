/**
 * Top 10 performa absensi: peringkat karyawan paling disiplin absen dalam
 * satu siklus gajian. Skor per hari (poin, keputusan Ucok 2026-11-15):
 * - hari valid = 30 poin + menit datang lebih awal (maks. 30 menit);
 *   syarat hari valid: ada jadwal shift terjadwal, absen masuk tidak lebih
 *   awal dari 30 menit sebelum jam mulai shift dan tidak telat, ada absen
 *   pulang, log tidak pernah diedit admin (editedBy terisi atau catatan
 *   "Diedit manual." = hangus);
 * - terlambat = denda sebesar menit telat mentah (tanpa toleransi 10
 *   menit); denda berlaku begitu ada absen masuk yang telat, walau tanpa
 *   absen pulang; log yang diedit = 0 poin (tanpa bonus maupun denda);
 * - tidak hadir / terlalu awal / tanpa absen pulang = 0 poin.
 * Peringkat diurutkan dari JUMLAH poin terbanyak selama periode (bukan
 * rasio terhadap jadwal masing-masing — itu tidak adil bagi yang jadwalnya
 * sedikit; keputusan Ucok 2026-11-15). Seri: nama naik. Juara 1–3 tampil
 * sebagai podium (juara 2 kiri, juara 1 tengah, juara 3 kanan); juara 1
 * memakai cincin api.
 */

export const BATAS_AWAL_MASUK_MENIT = 30;
/** Poin dasar satu hari valid; satu menit awal/telat = 1 poin. */
export const POIN_HARI_VALID = 30;
export const JUMLAH_TOP = 10;

export type HariTerjadwal = {
  userId: string;
  tanggal: string;
  mulaiMenit: number;
};

export type BarisAbsensiTop = {
  userId: string;
  tanggal: string;
  masukMenit: number | null;
  keluarMenit: number | null;
  editedBy: string | null;
  catatan: string | null;
};

export type PenggunaTop = {
  id: string;
  nama: string;
  foto: string | null;
  cabang: string | null;
};

export type PeringkatTop = {
  userId: string;
  nama: string;
  foto: string | null;
  cabang: string | null;
  valid: number;
  total: number;
  /** Poin total selama periode (bilangan bulat, bisa negatif). */
  skor: number;
};

export function hariValid(
  hari: HariTerjadwal,
  absensi: BarisAbsensiTop | undefined,
): boolean {
  if (!absensi) return false;
  if (absensi.masukMenit == null || absensi.keluarMenit == null) return false;
  // Terlalu awal (lebih dari 30 menit sebelum shift) atau telat.
  if (absensi.masukMenit < hari.mulaiMenit - BATAS_AWAL_MASUK_MENIT) return false;
  if (absensi.masukMenit > hari.mulaiMenit) return false;
  // Log yang pernah diedit admin menghanguskan hari itu.
  if (absensi.editedBy != null) return false;
  if (absensi.catatan?.includes("Diedit manual.")) return false;
  return true;
}

/**
 * Poin satu hari: 30 + menit datang lebih awal bila hari valid,
 * -menit telat bila terlambat, 0 bila tidak hadir / terlalu awal /
 * tanpa absen pulang / log diedit.
 */
export function hitungPoinHari(
  hari: HariTerjadwal,
  absensi: BarisAbsensiTop | undefined,
): number {
  if (!absensi || absensi.masukMenit == null) return 0;
  // Log yang pernah diedit admin menghanguskan hari itu sepenuhnya.
  if (absensi.editedBy != null) return 0;
  if (absensi.catatan?.includes("Diedit manual.")) return 0;
  // Terlambat: denda menit telat mentah (tanpa toleransi).
  if (absensi.masukMenit > hari.mulaiMenit) {
    return -(absensi.masukMenit - hari.mulaiMenit);
  }
  // Terlalu awal (lebih dari 30 menit sebelum shift): hari tidak valid.
  if (absensi.masukMenit < hari.mulaiMenit - BATAS_AWAL_MASUK_MENIT) return 0;
  // Tanpa absen pulang: hari tidak valid.
  if (absensi.keluarMenit == null) return 0;
  // Hari valid: 30 poin + menit datang lebih awal.
  return POIN_HARI_VALID + (hari.mulaiMenit - absensi.masukMenit);
}

export function hitungPeringkat(
  hari: HariTerjadwal[],
  absensi: BarisAbsensiTop[],
  pengguna: PenggunaTop[],
): PeringkatTop[] {
  const absensiPerKunci = new Map(
    absensi.map((a) => [`${a.userId}|${a.tanggal}`, a]),
  );
  const perPengguna = new Map<
    string,
    { valid: number; total: number; skor: number }
  >();
  for (const h of hari) {
    const hitung = perPengguna.get(h.userId) ?? { valid: 0, total: 0, skor: 0 };
    hitung.total += 1;
    const baris = absensiPerKunci.get(`${h.userId}|${h.tanggal}`);
    if (hariValid(h, baris)) hitung.valid += 1;
    hitung.skor += hitungPoinHari(h, baris);
    perPengguna.set(h.userId, hitung);
  }
  const penggunaPerId = new Map(pengguna.map((p) => [p.id, p]));
  const hasil: PeringkatTop[] = [];
  for (const [userId, hitung] of perPengguna) {
    const p = penggunaPerId.get(userId);
    if (!p || hitung.total === 0) continue;
    hasil.push({
      userId,
      nama: p.nama,
      foto: p.foto,
      cabang: p.cabang,
      valid: hitung.valid,
      total: hitung.total,
      skor: hitung.skor,
    });
  }
  hasil.sort((a, b) => b.skor - a.skor || a.nama.localeCompare(b.nama));
  return hasil.slice(0, JUMLAH_TOP);
}

/**
 * Bagi peringkat jadi podium (juara 1–3, susunan tampil: 2 kiri, 1 tengah,
 * 3 kanan) dan sisanya (peringkat 4 ke bawah).
 */
export function bagiPodium(peringkat: PeringkatTop[]): {
  podium: { item: PeringkatTop; rank: number }[];
  sisanya: PeringkatTop[];
} {
  const tiga = peringkat.slice(0, 3);
  const podium: { item: PeringkatTop; rank: number }[] = [];
  if (tiga[1]) podium.push({ item: tiga[1], rank: 2 });
  if (tiga[0]) podium.push({ item: tiga[0], rank: 1 });
  if (tiga[2]) podium.push({ item: tiga[2], rank: 3 });
  return { podium, sisanya: peringkat.slice(3) };
}

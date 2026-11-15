/**
 * Top 10 performa absensi: peringkat karyawan paling disiplin absen dalam
 * satu siklus gajian. Aturan satu hari valid (ketat, sesuai permintaan
 * Ucok 2026-11-15):
 * - ada jadwal shift terjadwal pada tanggal itu;
 * - absen masuk tidak lebih awal dari 30 menit sebelum jam mulai shift
 *   dan tidak telat (masuk setelah jam mulai = tidak valid);
 * - ada absen pulang (keluarMenit terisi);
 * - log tidak pernah diedit admin (editedBy terisi atau catatan
 *   "Diedit manual." = hangus).
 * Peringkat diurutkan dari JUMLAH hari valid terbanyak selama periode
 * (bukan rasio terhadap jadwal masing-masing — itu tidak adil bagi yang
 * jadwalnya sedikit; keputusan Ucok 2026-11-15). Skor = hari valid /
 * jumlah hari periode (penyebut sama untuk semua orang, jadi urutannya
 * sama dengan urutan jumlah hari valid). Seri: nama naik. Juara 1–3
 * tampil sebagai podium (juara 2 kiri, juara 1 tengah, juara 3 kanan);
 * juara 1 memakai cincin api.
 */

/** Jumlah hari dalam rentang (inklusif) dari dua tanggal yyyy-mm-dd. */
export function hitungHariPeriode(dari: string, sampai: string): number {
  const awal = Date.UTC(
    Number(dari.slice(0, 4)),
    Number(dari.slice(5, 7)) - 1,
    Number(dari.slice(8, 10)),
  );
  const akhir = Date.UTC(
    Number(sampai.slice(0, 4)),
    Number(sampai.slice(5, 7)) - 1,
    Number(sampai.slice(8, 10)),
  );
  return Math.max(0, Math.round((akhir - awal) / 86_400_000) + 1);
}

export const BATAS_AWAL_MASUK_MENIT = 30;
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
  /** 0..1 */
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

export function hitungPeringkat(
  hari: HariTerjadwal[],
  absensi: BarisAbsensiTop[],
  pengguna: PenggunaTop[],
  hariPeriode: number,
): PeringkatTop[] {
  const absensiPerKunci = new Map(
    absensi.map((a) => [`${a.userId}|${a.tanggal}`, a]),
  );
  const perPengguna = new Map<string, { valid: number; total: number }>();
  for (const h of hari) {
    const hitung = perPengguna.get(h.userId) ?? { valid: 0, total: 0 };
    hitung.total += 1;
    if (hariValid(h, absensiPerKunci.get(`${h.userId}|${h.tanggal}`))) {
      hitung.valid += 1;
    }
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
      // Penyebut periode (sama untuk semua) — bukan jadwal masing-masing.
      skor: hariPeriode > 0 ? hitung.valid / hariPeriode : 0,
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

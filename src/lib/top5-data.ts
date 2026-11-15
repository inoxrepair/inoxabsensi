import { db } from "@/lib/db";
import { labelPeriode, rentangPeriodeGajian } from "@/lib/rekap";
import {
  hitungHariPeriode,
  hitungPeringkat,
  type BarisAbsensiTop,
  type HariTerjadwal,
  type PenggunaTop,
  type PeringkatTop,
} from "@/lib/top5";
import { tanggalLokal } from "@/lib/waktu";

/**
 * Top 5 performa absensi untuk siklus gajian berjalan. Semua via raw SQL
 * (pola yang sama dengan insentif dan log login). Bila query gagal
 * (mis. sebelum migrasi — tidak ada migrasi baru di fitur ini), halaman
 * menampilkan empty state, bukan error.
 */

export type HasilTop5 = {
  peringkat: PeringkatTop[];
  periode: string;
  dari: string;
  sampai: string;
};

export async function ambilTop5(): Promise<HasilTop5> {
  const bulanIni = tanggalLokal().slice(0, 7);
  const rentang = rentangPeriodeGajian(bulanIni);
  const kosong: HasilTop5 = {
    peringkat: [],
    periode: labelPeriode(bulanIni),
    dari: rentang.dari,
    sampai: rentang.sampai,
  };
  try {
    // Hanya hari dengan shift terjadwal; shift fleksibel tidak punya jam
    // mulai tetap sehingga tidak masuk penilaian.
    const hari = await db.$queryRaw<HariTerjadwal[]>`
      SELECT j."userId", j."tanggal", s."mulaiMenit"
      FROM "Jadwal" j
      JOIN "Shift" s ON s."id" = j."shiftId"
      WHERE j."tanggal" >= ${rentang.dari} AND j."tanggal" <= ${rentang.sampai}
        AND s."mode" = 'terjadwal'
    `;
    const absensi = await db.$queryRaw<BarisAbsensiTop[]>`
      SELECT "userId", "tanggal", "masukMenit", "keluarMenit", "editedBy", "catatan"
      FROM "Absensi"
      WHERE "tanggal" >= ${rentang.dari} AND "tanggal" <= ${rentang.sampai}
    `;
    const pengguna = await db.$queryRaw<PenggunaTop[]>`
      SELECT u."id", u."name" AS "nama", u."image" AS "foto", c."nama" AS "cabang"
      FROM "User" u
      LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
      WHERE u."aktif" = true
    `;
    return {
      ...kosong,
      peringkat: hitungPeringkat(
        hari,
        absensi,
        pengguna,
        hitungHariPeriode(rentang.dari, rentang.sampai),
      ),
    };
  } catch {
    return kosong;
  }
}

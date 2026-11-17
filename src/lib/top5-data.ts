import { db } from "@/lib/db";
import { ambilInsentifRentang } from "@/lib/insentif";
import { labelPeriode, rentangPeriodeGajian } from "@/lib/rekap";
import {
  hitungPeringkat,
  hitungPeringkatPerbaikan,
  type MasukanPerbaikan,
  type BarisAbsensiTop,
  type HariTerjadwal,
  type PenggunaTop,
  type PeringkatPerbaikan,
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
      peringkat: hitungPeringkat(hari, absensi, pengguna),
    };
  } catch {
    return kosong;
  }
}

export type HasilTopPerbaikan = {
  peringkat: PeringkatPerbaikan[];
  periode: string;
  dari: string;
  sampai: string;
};

/**
 * Top 10 "Perbaikan": peringkat karyawan dari jumlah item/baris transaksi
 * insentif (1 perbaikan = 1 poin) untuk siklus gajian berjalan yang sama
 * dengan tab absensi. Foto diambil dari User (ringkasan insentif tidak
 * membawa foto). Bila query gagal, halaman menampilkan empty state.
 */
export async function ambilTopPerbaikan(): Promise<HasilTopPerbaikan> {
  const bulanIni = tanggalLokal().slice(0, 7);
  const rentang = rentangPeriodeGajian(bulanIni);
  const kosong: HasilTopPerbaikan = {
    peringkat: [],
    periode: labelPeriode(bulanIni),
    dari: rentang.dari,
    sampai: rentang.sampai,
  };
  try {
    const ringkasan = await ambilInsentifRentang(rentang.dari, rentang.sampai);
    const foto = await db.$queryRaw<{ id: string; foto: string | null }[]>`
      SELECT "id", "image" AS "foto" FROM "User" WHERE "aktif" = true
    `;
    const fotoPerId = new Map(foto.map((f) => [f.id, f.foto]));
    const masukan: MasukanPerbaikan[] = ringkasan.map((r) => ({
      userId: r.userId,
      nama: r.user.name,
      foto: fotoPerId.get(r.userId) ?? null,
      cabang: r.user.cabangNama,
      jumlahTransaksi: r.jumlahTransaksi,
    }));
    return { ...kosong, peringkat: hitungPeringkatPerbaikan(masukan) };
  } catch {
    return kosong;
  }
}

import { db } from "@/lib/db";
import { ambilInsentifRentang } from "@/lib/insentif";
import { labelPeriode, rentangPeriodeGajian } from "@/lib/rekap";
import {
  cacheTop5Segar,
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
 * Cache peringkat di memori proses (TTL 5 menit, lihat TTL_CACHE_TOP5_MS):
 * halaman Top 10 dibuka berkali-kali sehari, tapi isinya hanya berubah
 * bila ada yang absen atau sinkron insentif jalan. Kunci = rentang gajian
 * supaya pergantian periode tidak menyajikan data periode lama. Yang
 * di-cache hanya hasil sukses — gagal query tidak di-cache supaya
 * kunjungan berikutnya langsung mencoba lagi.
 */
type EntriCache<T> = {
  dari: string;
  sampai: string;
  waktu: number;
  hasil: T;
};

let cacheAbsensi: EntriCache<HasilTop5> | null = null;
let cachePerbaikan: EntriCache<HasilTopPerbaikan> | null = null;

function cacheCocok<T>(
  entri: EntriCache<T> | null,
  dari: string,
  sampai: string,
): T | null {
  if (!entri) return null;
  if (entri.dari !== dari || entri.sampai !== sampai) return null;
  if (!cacheTop5Segar(entri.waktu)) return null;
  return entri.hasil;
}

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
  const dariCache = cacheCocok(cacheAbsensi, rentang.dari, rentang.sampai);
  if (dariCache) return dariCache;
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
    const hasil: HasilTop5 = {
      ...kosong,
      peringkat: hitungPeringkat(hari, absensi, pengguna),
    };
    cacheAbsensi = {
      dari: rentang.dari,
      sampai: rentang.sampai,
      waktu: Date.now(),
      hasil,
    };
    return hasil;
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
  const dariCache = cacheCocok(cachePerbaikan, rentang.dari, rentang.sampai);
  if (dariCache) return dariCache;
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
    const hasil: HasilTopPerbaikan = {
      ...kosong,
      peringkat: hitungPeringkatPerbaikan(masukan),
    };
    cachePerbaikan = {
      dari: rentang.dari,
      sampai: rentang.sampai,
      waktu: Date.now(),
      hasil,
    };
    return hasil;
  } catch {
    return kosong;
  }
}

import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import type { Pengguna } from "@/lib/session";
import {
  bacaRentang,
  rekapPerKaryawan,
  type CatatanAbsensi,
  type Rentang,
} from "@/lib/rekap";
import { tanggalLokal } from "@/lib/waktu";

/**
 * Query rekap bersama halaman /admin/rekap dan endpoint export CSV,
 * supaya keduanya dijamin menghasilkan angka yang identik.
 */

export type BarisTabel = {
  userId: string;
  nama: string;
  cabang: string;
  hadir: number;
  telat: number;
  izin: number;
  alpa: number;
  menitKerja: number;
  menitTelat: number;
  belumKeluar: number;
};

export type LingkupRekap = Rentang & {
  kustom: boolean;
  cabangId: string;
};

/** Normalkan query string agar aman dipakai di query database. */
export function bacaLingkup(
  admin: Pengguna,
  q: { periode?: string; cabang?: string; dari?: string; sampai?: string },
): LingkupRekap {
  const rentang = bacaRentang(q, tanggalLokal().slice(0, 7));

  // Role cabang dipaksa ke cabangnya sendiri, apa pun isi query.
  const cabangId =
    roleTerbatasCabang(admin.role) ? (admin.cabangId ?? "") : (q.cabang ?? "");

  return { ...rentang, cabangId };
}

export async function ambilRekap(lingkup: LingkupRekap) {
  const { dari, sampai, cabangId } = lingkup;
  const filterCabang = cabangId ? { cabangId } : {};

  const [karyawan, catatan] = await Promise.all([
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...filterCabang },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, cabang: { select: { nama: true } } },
    }),
    db.absensi.findMany({
      // Tanggal disimpan sebagai "yyyy-mm-dd" sehingga perbandingan
      // leksikografis identik dengan perbandingan kronologis.
      where: {
        tanggal: { gte: dari, lte: sampai },
        user: { aktif: true, ...filterCabang },
      },
      select: {
        userId: true,
        status: true,
        masukMenit: true,
        keluarMenit: true,
        menitTelat: true,
      },
    }),
  ]);

  const bersih: CatatanAbsensi[] = catatan.map((c) => ({
    userId: c.userId,
    status: bacaStatusAbsensi(c.status),
    masukMenit: c.masukMenit,
    keluarMenit: c.keluarMenit,
    menitTelat: c.menitTelat,
  }));

  const peta = rekapPerKaryawan(bersih);

  // Karyawan tanpa catatan tetap ditampilkan dengan nilai nol, supaya
  // admin bisa melihat siapa yang belum pernah absen sama sekali.
  const baris: BarisTabel[] = karyawan.map((k) => {
    const r = peta.get(k.id);
    return {
      userId: k.id,
      nama: k.name,
      cabang: k.cabang?.nama ?? "—",
      hadir: r?.hadir ?? 0,
      telat: r?.telat ?? 0,
      izin: r?.izin ?? 0,
      alpa: r?.alpa ?? 0,
      menitKerja: r?.menitKerja ?? 0,
      menitTelat: r?.menitTelat ?? 0,
      belumKeluar: r?.belumKeluar ?? 0,
    };
  });

  return baris;
}

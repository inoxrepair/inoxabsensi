import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import type { Pengguna } from "@/lib/session";
import {
  bacaRentang,
  daftarTanggal,
  keadaanHarian,
  rekapPerKaryawan,
  shiftFull,
  type CatatanAbsensi,
  type KeadaanHari,
  type Rentang,
} from "@/lib/rekap";
import { tanggalLokal, toleransiTerpakai } from "@/lib/waktu";

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
  /** Akumulasi menit yang masih di dalam toleransi shift. */
  menitToleransi: number;
  belumKeluar: number;
  kekuranganMenit: number;
  /** Keadaan per tanggal pada rentang aktif (absensi digabung jadwal). */
  statusHarian: Map<string, KeadaanHari>;
  /** Tanggal yang memakai shift Full, untuk keterangan tambahan "F". */
  jadwalFull: Set<string>;
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

  const [karyawan, catatan, jadwal] = await Promise.all([
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
        tanggal: true,
        status: true,
        masukMenit: true,
        keluarMenit: true,
        menitTelat: true,
        modeShift: true,
        kekuranganMenit: true,
        cycles: { select: { masukMenit: true, keluarMenit: true } },
      },
    }),
    // Jadwal memberi konteks hari kosong: ada shift = alpa, tanpa shift = off.
    db.jadwal.findMany({
      where: {
        tanggal: { gte: dari, lte: sampai },
        user: { aktif: true, ...filterCabang },
      },
      select: {
        userId: true,
        tanggal: true,
        shift: {
          select: {
            nama: true,
            mulaiMenit: true,
            toleransiMenit: true,
            mode: true,
          },
        },
      },
    }),
  ]);

  const petaShift = new Map(
    jadwal.map((j) => [`${j.userId}|${j.tanggal}`, j.shift]),
  );

  const bersih: CatatanAbsensi[] = catatan.map((c) => {
    const shift = petaShift.get(`${c.userId}|${c.tanggal}`);
    const fleksibel =
      c.modeShift === "fleksibel" || shift?.mode === "fleksibel";
    const menitToleransi =
      c.masukMenit == null || !shift || fleksibel
        ? 0
        : toleransiTerpakai(c.masukMenit, shift);
    return {
      userId: c.userId,
      tanggal: c.tanggal,
      status: bacaStatusAbsensi(c.status),
      masukMenit: c.masukMenit,
      keluarMenit: c.keluarMenit,
      menitTelat: c.menitTelat,
      menitToleransi,
      kekuranganMenit: c.kekuranganMenit,
      cycles: c.cycles,
    };
  });

  const peta = rekapPerKaryawan(bersih);
  const petaHarian = keadaanHarian(
    bersih,
    jadwal.map((j) => ({
      userId: j.userId,
      tanggal: j.tanggal,
      shiftNama: j.shift?.nama ?? null,
    })),
    daftarTanggal({ dari, sampai }),
  );

  // Kumpulkan tanggal bershift Full per karyawan agar bisa ditandai di kolom.
  const petaFull = new Map<string, Set<string>>();
  for (const j of jadwal) {
    if (!shiftFull(j.shift?.nama)) continue;
    const set = petaFull.get(j.userId) ?? new Set<string>();
    set.add(j.tanggal);
    petaFull.set(j.userId, set);
  }

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
      menitToleransi: r?.menitToleransi ?? 0,
      belumKeluar: r?.belumKeluar ?? 0,
      kekuranganMenit: r?.kekuranganMenit ?? 0,
      statusHarian: petaHarian.get(k.id) ?? new Map<string, KeadaanHari>(),
      jadwalFull: petaFull.get(k.id) ?? new Set<string>(),
    };
  });

  return baris;
}

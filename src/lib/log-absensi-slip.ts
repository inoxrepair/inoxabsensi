import { bacaStatusAbsensi } from "@/lib/domain";
import { db } from "@/lib/db";
import { menitKerjaCycle } from "@/lib/payroll";
import { daftarTanggal, type KeadaanHari } from "@/lib/rekap";
import { keJam } from "@/lib/waktu";

/**
 * Log absensi satu karyawan untuk halaman 2 slip gaji: satu baris per
 * tanggal dalam jendela hitung (periode penuh atau rentang kustom yang
 * dipilih). Pola yang sama dengan arsip absensi (lib/arsip-pdf.ts):
 * hari berabsensi memakai statusnya; hari tanpa absensi tetapi ada
 * jadwal = alpa; tanpa jadwal = off.
 */

export type BarisLogSlip = {
  tanggal: string;
  keadaan: KeadaanHari;
  /** Nama shift hari itu; null bila tidak ada jadwal. */
  shiftNama: string | null;
  /** Jam shift "08.30–16.30"; null bila tidak ada jadwal. */
  shiftJam: string | null;
  masukMenit: number | null;
  keluarMenit: number | null;
  /** Menit kerja dari cycle yang sudah check-out; null bila tidak ada cycle. */
  menitKerja: number | null;
  menitTelat: number;
  /** Cabang tempat absen (snapshot baris absensi); null bila tidak ada baris absensi. */
  cabang: string | null;
};

export type CatatanLogSlip = {
  tanggal: string;
  status: string;
  masukMenit: number | null;
  keluarMenit: number | null;
  menitTelat: number;
  cabangNama: string | null;
  cycles: { masukMenit: number; keluarMenit: number | null }[];
};

export type JadwalLogSlip = {
  tanggal: string;
  shift: { nama: string; mulaiMenit: number; selesaiMenit: number } | null;
};

/** Susun satu baris log per tanggal dalam jendela (fungsi murni, bisa diuji). */
export function bangunLogAbsensiSlip({
  dari,
  sampai,
  catatan,
  jadwal,
}: {
  dari: string;
  sampai: string;
  catatan: CatatanLogSlip[];
  jadwal: JadwalLogSlip[];
}): BarisLogSlip[] {
  const petaAbsensi = new Map(catatan.map((a) => [a.tanggal, a]));
  const petaJadwal = new Map(jadwal.map((j) => [j.tanggal, j.shift]));

  return daftarTanggal({ dari, sampai }).map((tanggal) => {
    const a = petaAbsensi.get(tanggal);
    const shift = petaJadwal.get(tanggal) ?? null;

    // Hari tanpa absensi tetap dicatat: ada jadwal = alpa, tanpa jadwal = off.
    const keadaan: KeadaanHari = a
      ? bacaStatusAbsensi(a.status)
      : shift
        ? "alpa"
        : "off";

    const cycles = a?.cycles?.length
      ? a.cycles
      : a?.masukMenit != null
        ? [{ masukMenit: a.masukMenit, keluarMenit: a.keluarMenit }]
        : [];
    const menitKerja = cycles.length ? menitKerjaCycle(cycles) : null;

    return {
      tanggal,
      keadaan,
      shiftNama: shift?.nama ?? null,
      shiftJam: shift ? `${keJam(shift.mulaiMenit)}–${keJam(shift.selesaiMenit)}` : null,
      masukMenit: cycles[0]?.masukMenit ?? a?.masukMenit ?? null,
      keluarMenit: cycles.at(-1)?.keluarMenit ?? a?.keluarMenit ?? null,
      menitKerja,
      menitTelat: a?.menitTelat ?? 0,
      cabang: a?.cabangNama ?? null,
    };
  });
}

/** Ambil log absensi satu karyawan dalam jendela (periode/rentang kustom slip). */
export async function ambilLogAbsensiSlip(
  userId: string,
  dari: string,
  sampai: string,
): Promise<BarisLogSlip[]> {
  const [catatan, jadwal] = await Promise.all([
    db.absensi.findMany({
      where: { userId, tanggal: { gte: dari, lte: sampai } },
      select: {
        tanggal: true,
        status: true,
        masukMenit: true,
        keluarMenit: true,
        menitTelat: true,
        cabang: { select: { nama: true } },
        cycles: { select: { masukMenit: true, keluarMenit: true } },
      },
      orderBy: { tanggal: "asc" },
    }),
    db.jadwal.findMany({
      where: { userId, tanggal: { gte: dari, lte: sampai } },
      select: {
        tanggal: true,
        shift: { select: { nama: true, mulaiMenit: true, selesaiMenit: true } },
      },
      orderBy: { tanggal: "asc" },
    }),
  ]);

  return bangunLogAbsensiSlip({
    dari,
    sampai,
    catatan: catatan.map((a) => ({
      tanggal: a.tanggal,
      status: a.status,
      masukMenit: a.masukMenit,
      keluarMenit: a.keluarMenit,
      menitTelat: a.menitTelat,
      cabangNama: a.cabang?.nama ?? null,
      cycles: a.cycles,
    })),
    jadwal: jadwal.map((j) => ({ tanggal: j.tanggal, shift: j.shift })),
  });
}

import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
import { bacaRentang, labelRentang, tanggalValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import {
  awalMinggu,
  indeksHari,
  keJam,
  selisihHari,
  tanggalGeser,
  tanggalLokal,
} from "@/lib/waktu";
import type { ShiftLengkap } from "./daftar-shift";
import type { BarisJadwal } from "./matriks-jadwal";
import { PanelJadwal } from "./panel-jadwal";
import Link from "next/link";

export const dynamic = "force-dynamic";

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminJadwalPage({
  searchParams,
}: {
  searchParams: Promise<{
    minggu?: string;
    cabang?: string;
    dari?: string;
    sampai?: string;
  }>;
}) {
  const admin = await wajibAkses("jadwal");
  const q = await searchParams;
  const hariIni = tanggalLokal();

  const senin = awalMinggu(
    q.minggu && POLA_TANGGAL.test(q.minggu) ? q.minggu : hariIni,
  );
  const tanggalMinggu = Array.from({ length: 7 }, (_, i) =>
    tanggalGeser(senin, i),
  );

  const pakaiRentang = Boolean(
    q.dari && q.sampai && tanggalValid(q.dari) && tanggalValid(q.sampai),
  );
  const rentang = bacaRentang(
    { dari: q.dari, sampai: q.sampai },
    hariIni.slice(0, 7),
  );
  const jumlahHari = pakaiRentang
    ? Math.min(62, selisihHari(rentang.dari, rentang.sampai) + 1)
    : 7;
  const tanggalTampil = pakaiRentang
    ? Array.from({ length: jumlahHari }, (_, i) => tanggalGeser(rentang.dari, i))
    : tanggalMinggu;
  const rentangTampil = pakaiRentang
    ? {
        ...rentang,
        // URL manual yang lebih dari 62 hari dipotong agar label sesuai
        // dengan kolom yang benar-benar dirender.
        sampai: tanggalTampil[tanggalTampil.length - 1],
      }
    : rentang;

  const cabangTerpilih = roleTerbatasCabang(admin.role)
    ? (admin.cabangId ?? "")
    : (q.cabang ?? "");
  const lingkup = cabangTerpilih ? { cabangId: cabangTerpilih } : {};

  const [karyawan, shiftRows, jadwal, cabang] = await Promise.all([
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...lingkup },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, cabang: { select: { nama: true } } },
    }),
    db.shift.findMany({
      orderBy: { mulaiMenit: "asc" },
      include: { _count: { select: { jadwal: true } } },
    }),
    db.jadwal.findMany({
      where: {
        tanggal: { in: tanggalTampil },
        user: { aktif: true, ...lingkup },
      },
      select: { userId: true, tanggal: true, shiftId: true, seragam: true },
    }),
    db.cabang.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const petaJadwal = new Map(
    jadwal.map((j) => [`${j.userId}|${j.tanggal}`, j]),
  );
  const baris: BarisJadwal[] = karyawan.map((k) => ({
    userId: k.id,
    nama: k.name,
    cabang: k.cabang?.nama ?? "Belum ditempatkan",
    hari: tanggalTampil.map((tgl) => {
      const j = petaJadwal.get(`${k.id}|${tgl}`);
      return j?.shiftId ? { shiftId: j.shiftId, seragam: j.seragam } : null;
    }),
  }));

  const shiftLengkap: ShiftLengkap[] = shiftRows.map((s) => ({
    id: s.id,
    nama: s.nama,
    mulai: keJam(s.mulaiMenit),
    selesai: keJam(s.selesaiMenit),
    toleransiMenit: s.toleransiMenit,
    dipakai: s._count.jadwal,
    lintasTengahMalam: s.selesaiMenit <= s.mulaiMenit,
  }));
  const terjadwal = jadwal.filter((j) => j.shiftId).length;
  const labelTanggal = pakaiRentang
    ? labelRentang(rentangTampil)
    : `${formatTanggal(senin)} – ${formatTanggal(tanggalMinggu[6])}`;

  return (
    <>
      <PageHeader
        title="Jadwal Shift"
        description={`${karyawan.length} karyawan · ${terjadwal} hari kerja terjadwal · ${labelTanggal}.`}
        action={
          admin.role === "headstore" ? (
            <Link
              href="/karyawan"
              className="rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-medium"
            >
              ← Kembali ke Absensi
            </Link>
          ) : undefined
        }
      />

      <PanelJadwal
        minggu={tanggalTampil}
        baris={baris}
        shift={shiftLengkap.map((s) => ({
          id: s.id,
          nama: s.nama,
          mulai: s.mulai,
          selesai: s.selesai,
        }))}
        shiftLengkap={shiftLengkap}
        bolehUbahShift={admin.role === "super_admin"}
        bolehPilihCabang={admin.role === "super_admin"}
        cabang={cabang}
        cabangTerpilih={cabangTerpilih}
        karyawanRentang={karyawan.map((k) => ({ id: k.id, nama: k.name }))}
        rentangAktif={{
          dari: pakaiRentang ? rentang.dari : tanggalMinggu[0],
          sampai: pakaiRentang ? rentangTampil.sampai : tanggalMinggu[6],
        }}
        navigasi={{
          labelMinggu: labelTanggal,
          sebelumnya: tanggalGeser(senin, -7),
          berikutnya: tanggalGeser(senin, 7),
          iniMingguIni: senin === awalMinggu(hariIni),
          seninSekarang: senin,
          seninSebelumnya: tanggalGeser(senin, -7),
          rentangAktif: pakaiRentang,
        }}
      />

      <p className="mt-4 text-xs text-muted">
        Perubahan per sel tersimpan otomatis. Overview rentang hanya mengubah
        tampilan tabel; Terapkan shift massal mengubah jadwal karyawan. Hari ini adalah{" "}
        {[
          "Senin",
          "Selasa",
          "Rabu",
          "Kamis",
          "Jumat",
          "Sabtu",
          "Minggu",
        ][indeksHari(hariIni)]}
        .
      </p>
    </>
  );
}

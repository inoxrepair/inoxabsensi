import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import { wajibAkses } from "@/lib/session";
import { bacaRentang } from "@/lib/rekap";
import { tanggalLokal, durasiMenit } from "@/lib/waktu";
import {
  folderKaryawan,
  MAKS_BULAN_ARSIP,
  namaArsip,
  namaBulanan,
  periodeDari,
  rentangTerlaluPanjang,
} from "@/lib/arsip";
import { buatArsipPdf, type BarisArsipPdf } from "@/lib/arsip-pdf";
import { bacaStatusWajah } from "@/lib/wajah";
import type { KeadaanHari } from "@/lib/rekap";

/** Pembuatan banyak PDF butuh waktu; beri ruang lebih daripada default. */
export const maxDuration = 300;

/**
 * Unduh arsip absensi sebagai ZIP berisi satu PDF per bulan per karyawan.
 *
 * Keamanan:
 * - Hanya role yang punya akses menu karyawan (admin) yang boleh mengunduh.
 * - Admin cabang otomatis dibatasi ke cabangnya sendiri, bukan lewat query.
 * - Rentang dibatasi agar server tidak timeout atau kehabisan memori.
 */
export async function GET(request: Request) {
  const admin = await wajibAkses("karyawan");
  const q = new URL(request.url).searchParams;

  const rentang = bacaRentang(
    { dari: q.get("dari") ?? undefined, sampai: q.get("sampai") ?? undefined },
    tanggalLokal().slice(0, 7),
  );

  if (rentangTerlaluPanjang(rentang.dari, rentang.sampai)) {
    return new Response(
      `Rentang arsip maksimal ${MAKS_BULAN_ARSIP} bulan.`,
      { status: 400 },
    );
  }

  // Admin cabang tidak bisa dilepas dari cabangnya lewat query string.
  const cabangId = roleTerbatasCabang(admin.role)
    ? (admin.cabangId ?? "-")
    : (q.get("cabang") ?? "");
  const filterCabang = cabangId ? { cabangId } : {};

  const [karyawan, catatan, jadwal] = await Promise.all([
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...filterCabang },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
        jabatan: true,
        cabang: { select: { nama: true } },
      },
    }),
    db.absensi.findMany({
      where: {
        tanggal: { gte: rentang.dari, lte: rentang.sampai },
        user: { aktif: true, ...filterCabang },
      },
      select: {
        userId: true,
        tanggal: true,
        status: true,
        masukMenit: true,
        keluarMenit: true,
        menitTelat: true,
        faceStatus: true,
        cycles: { select: { masukMenit: true, keluarMenit: true } },
      },
    }),
    db.jadwal.findMany({
      where: {
        tanggal: { gte: rentang.dari, lte: rentang.sampai },
        user: { aktif: true, ...filterCabang },
      },
      select: { userId: true, tanggal: true, shift: { select: { nama: true } } },
    }),
  ]);

  // Susun peta agar pembacaan per karyawan/per tanggal tidak berulang.
  const absensiMap = new Map(
    catatan.map((a) => [`${a.userId}|${a.tanggal}`, a]),
  );
  const jadwalMap = new Map(
    jadwal.map((j) => [`${j.userId}|${j.tanggal}`, j.shift?.nama ?? null]),
  );

  // Arsipkan hanya karyawan yang benar-benar punya catatan pada rentang ini.
  const idBerisi = new Set(catatan.map((a) => a.userId));
  const karyawanBerisi = karyawan.filter((k) => idBerisi.has(k.id));

  const tanggalRentang = daftarTanggal(rentang.dari, rentang.sampai);

  // Bangun PDF per karyawan per bulan, lalu alirkan ke ZIP.
  const arsip = archiver("zip", { zlib: { level: 9 } });
  const keluaran = new PassThrough();
  arsip.pipe(keluaran);

  for (const k of karyawanBerisi) {
    const perBulan = new Map<string, BarisArsipPdf[]>();

    for (const tanggal of tanggalRentang) {
      const a = absensiMap.get(`${k.id}|${tanggal}`);
      const shiftNama = jadwalMap.get(`${k.id}|${tanggal}`);
      const punyaJadwal = jadwalMap.has(`${k.id}|${tanggal}`);

      // Hari tanpa absensi tetap diarsipkan: ada jadwal = alpa, tanpa jadwal = off.
      const keadaan: KeadaanHari | null = a
        ? bacaStatusAbsensi(a.status)
        : punyaJadwal
          ? shiftNama
            ? "alpa"
            : "off"
          : "off";

      const cycles = a?.cycles?.length
        ? a.cycles
        : a?.masukMenit != null
          ? [{ masukMenit: a.masukMenit, keluarMenit: a.keluarMenit }]
          : [];
      const menitKerja = cycles.length
        ? cycles.reduce(
            (t, c) =>
              t + (c.keluarMenit == null ? 0 : durasiMenit(c.masukMenit, c.keluarMenit)),
            0,
          )
        : null;

      const periode = periodeDari(tanggal);
      const daftar = perBulan.get(periode) ?? [];
      daftar.push({
        tanggal,
        keadaan,
        shiftNama: shiftNama ?? null,
        masukMenit: cycles[0]?.masukMenit ?? a?.masukMenit ?? null,
        keluarMenit: cycles.at(-1)?.keluarMenit ?? a?.keluarMenit ?? null,
        menitKerja,
        menitTelat: a?.menitTelat ?? 0,
        faceStatus: bacaStatusWajah(a?.faceStatus),
      });
      perBulan.set(periode, daftar);
    }

    if (perBulan.size === 0) continue;

    const folder = `${folderKaryawan(k.name, k.username)}/`;
    for (const periode of [...perBulan.keys()].sort()) {
      const pdf = await buatArsipPdf({
        nama: k.name,
        username: k.username,
        cabang: k.cabang?.nama ?? "—",
        jabatan: k.jabatan,
        periode,
        baris: perBulan.get(periode)!,
      });
      arsip.append(Buffer.from(pdf), { name: `${folder}${namaBulanan(periode)}` });
    }
  }

  arsip.finalize();

  return new Response(Readable.toWeb(keluaran) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${namaArsip(rentang.dari, rentang.sampai)}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Daftar tanggal "yyyy-mm-dd" inklusif memakai aritmetika UTC. */
function daftarTanggal(dari: string, sampai: string): string[] {
  const [y1, m1, d1] = dari.split("-").map(Number);
  const [y2, m2, d2] = sampai.split("-").map(Number);
  const awal = Date.UTC(y1, m1 - 1, d1);
  const akhir = Date.UTC(y2, m2 - 1, d2);
  const jumlah = Math.round((akhir - awal) / 86_400_000);
  return Array.from({ length: jumlah + 1 }, (_, i) =>
    new Date(awal + i * 86_400_000).toISOString().slice(0, 10),
  );
}
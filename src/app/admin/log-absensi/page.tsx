import Link from "next/link";
import type { Route } from "next";
import { DataTable, type Kolom } from "@/components/ui/data-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import type { StatusAbsensi } from "@/lib/domain";
import { bacaRentang, labelRentang } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import {
  bacaStatusWajah,
  LABEL_STATUS_WAJAH,
  WARNA_STATUS_WAJAH,
} from "@/lib/wajah";
import { formatDurasi, keJam, selisihHari, tanggalLokal, durasiMenit } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";
import { FilterLog, type BarisLog } from "./filter";
import { AksiBaris } from "./baris";

export const dynamic = "force-dynamic";

/** Baris per halaman log — tanpa paginasi satu rentang bisa memuat ribuan baris. */
const BATAS_HALAMAN = 100;

export default async function AdminLogAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string; cabang?: string; cursor?: string }>;
}) {
  const admin = await wajibAkses("karyawan");
  const q = await searchParams;
  const rentang = bacaRentang({ dari: q.dari, sampai: q.sampai }, tanggalLokal().slice(0, 7));

  const cabangTerpilih = roleTerbatasCabang(admin.role)
    ? (admin.cabangId ?? "")
    : (q.cabang ?? "");
  const lingkup = cabangTerpilih ? { cabangId: cabangTerpilih } : {};

  // Filter yang sama dipakai query halaman, hitung total, dan agregat —
  // supaya kartu ringkasan tetap menghitung SELURUH rentang, bukan hanya
  // halaman yang tampil.
  const where = {
    tanggal: { gte: rentang.dari, lte: rentang.sampai },
    // Filter cabang di query memakai cabang yang tercatat pada baris
    // absensi itu (cabang penempatan saat absen), bukan cabang
    // penempatan karyawan saat ini — konsisten dengan kolom Cabang.
    ...(lingkup.cabangId ? { cabangId: lingkup.cabangId } : {}),
  };

  // Urutan total (id sebagai penentu seri) supaya kursor stabil:
  // tanggal + masukMenit saja bisa seri antar karyawan.
  const ambilHalaman = (cursor?: string) =>
    db.absensi.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { masukMenit: "asc" }, { id: "asc" }],
      include: {
        user: { select: { name: true } },
        // Cabang diambil dari baris Absensi (snapshot penempatan saat
        // absen), bukan dari User — supaya baris lama tetap menunjukkan
        // cabang tempat karyawan itu absen, walau penempatannya pindah.
        cabang: { select: { nama: true } },
        cycles: { orderBy: { urutan: "asc" } },
      },
      take: BATAS_HALAMAN,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

  // Kursor bisa basi bila baris itu dihapus setelah tautan dibuat
  // (hapus tersedia di halaman ini) — jatuh kembali ke halaman pertama.
  const absensi = await ambilHalaman(q.cursor).catch(() => ambilHalaman());

  const [cabang, auditHapus, totalCatatan, ringkasan] = await Promise.all([
    db.cabang.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    db.auditLog.findMany({
      where: { aksi: "hapus_absensi" },
      orderBy: { dibuatPada: "desc" },
      take: 20,
      select: { id: true, ringkasan: true, dibuatPada: true },
    }),
    db.absensi.count({ where }),
    // Total jam kerja + jumlah pengguna SELURUH rentang (bukan halaman):
    // dihitung di database supaya tidak perlu memuat semua baris.
    // Rumus jam kerja mencerminkan hitungan baris di bawah (dan
    // durasiMenit): cycle yang ada dijumlahkan (cycle terbuka = 0),
    // tanpa cycle memakai masuk-keluar baris; selisih negatif (lewat
    // tengah malam) ditambah 1440 menit.
    db.$queryRaw<{ totalMenit: bigint | number; totalPengguna: bigint | number }[]>`
      SELECT
        COALESCE(SUM(
          CASE WHEN EXISTS (SELECT 1 FROM "AbsensiCycle" c WHERE c."absensiId" = a."id")
            THEN (SELECT COALESCE(SUM(
              CASE WHEN c."keluarMenit" IS NOT NULL
                THEN CASE WHEN c."keluarMenit" >= c."masukMenit" THEN c."keluarMenit" - c."masukMenit" ELSE c."keluarMenit" + 1440 - c."masukMenit" END
                ELSE 0 END), 0)
              FROM "AbsensiCycle" c WHERE c."absensiId" = a."id")
            ELSE CASE WHEN a."masukMenit" IS NOT NULL AND a."keluarMenit" IS NOT NULL
              THEN CASE WHEN a."keluarMenit" >= a."masukMenit" THEN a."keluarMenit" - a."masukMenit" ELSE a."keluarMenit" + 1440 - a."masukMenit" END
              ELSE 0 END
          END), 0) AS "totalMenit",
        COUNT(DISTINCT a."userId") AS "totalPengguna"
      FROM "Absensi" a
      WHERE a."tanggal" >= ${rentang.dari} AND a."tanggal" <= ${rentang.sampai}
        AND (${!lingkup.cabangId} OR a."cabangId" = ${lingkup.cabangId})
    `,
  ]);

  const rows: BarisLog[] = absensi.map((a) => {
    const cycles = a.cycles.length
      ? a.cycles
      : a.masukMenit != null
        ? [{ urutan: 1, masukMenit: a.masukMenit, keluarMenit: a.keluarMenit }]
        : [];
    return {
    id: a.id,
    nama: a.user.name,
    cabang: a.cabang?.nama ?? "—",
    tanggal: a.tanggal,
    masuk: cycles[0]?.masukMenit ?? a.masukMenit,
    keluar: cycles.at(-1)?.keluarMenit ?? a.keluarMenit,
    status: bacaStatusAbsensi(a.status),
    menitKerja: cycles.length
      ? cycles.reduce((total, cycle) => total + (cycle.keluarMenit == null ? 0 : durasiMenit(cycle.masukMenit, cycle.keluarMenit)), 0)
      : a.masukMenit !== null && a.keluarMenit !== null ? durasiMenit(a.masukMenit, a.keluarMenit) : null,
    menitTelat: a.menitTelat,
    catatan: a.catatan ?? null,
    diedit: a.editedBy != null,
    faceStatus: bacaStatusWajah(a.faceStatus),
    faceJarak: a.faceJarak,
    cycles: cycles.map((cycle) => ({ urutan: cycle.urutan, masukMenit: cycle.masukMenit, keluarMenit: cycle.keluarMenit })),
  };
  });

  const jumlahHari = selisihHari(rentang.dari, rentang.sampai) + 1;
  // Ringkasan dari agregat database (seluruh rentang), bukan halaman.
  const totalJam = Number(ringkasan[0]?.totalMenit ?? 0);
  const totalPengguna = Number(ringkasan[0]?.totalPengguna ?? 0);

  // Tautan halaman berikutnya: pin rentang aktif (bukan query mentah,
  // supaya ganti bulan di tengah jalan tidak menggeser rentang) +
  // cabang terpilih + id baris terakhir sebagai kursor.
  const adaBerikutnya = rows.length === BATAS_HALAMAN;
  const paramsBerikutnya = new URLSearchParams({
    dari: rentang.dari,
    sampai: rentang.sampai,
  });
  if (cabangTerpilih) paramsBerikutnya.set("cabang", cabangTerpilih);
  if (adaBerikutnya) {
    paramsBerikutnya.set("cursor", rows[rows.length - 1].id);
  }
  const tautanBerikutnya = `/admin/log-absensi?${paramsBerikutnya}` as Route;

  const kolom: Kolom<BarisLog>[] = [
    { header: "Nama", cell: (r) => r.nama, rowHeader: true },
    { header: "Cabang", cell: (r) => <span className="text-muted">{r.cabang}</span> },
    { header: "Tanggal", cell: (r) => <span className="tabular-nums">{formatTanggal(r.tanggal)}</span> },
    { header: "Cycle", cell: (r) => r.cycles.length ? <div className="space-y-0.5 tabular-nums">{r.cycles.map((cycle) => <p key={cycle.urutan}>{cycle.urutan}. {keJam(cycle.masukMenit)}–{cycle.keluarMenit == null ? "aktif" : keJam(cycle.keluarMenit)}</p>)}</div> : "—" },
    { header: "Jam kerja", cell: (r) => (r.menitKerja !== null ? formatDurasi(r.menitKerja) : "—"), numeric: true },
    { header: "Telat", cell: (r) => (r.menitTelat > 0 ? `${r.menitTelat} m` : "0"), numeric: true },
    { header: "Status", cell: (r) => <StatusLabel status={r.status} /> },
    {
      header: "Catatan",
      cell: (r) =>
        r.catatan ? (
          <span>
            {r.catatan}
            {r.diedit ? (
              <span className="block text-xs font-normal text-muted">Diedit manual</span>
            ) : null}
          </span>
        ) : r.diedit ? (
          <span className="text-muted">Diedit manual</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { header: "Wajah", cell: (r) => <StatusWajahLabel row={r} /> },
    { header: "Aksi", cell: (r) => <AksiBaris row={r} canDelete={admin.role === "super_admin"} /> },
  ];

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Log Absensi</h1>
          <p className="mt-1 text-sm text-muted">
            {`${labelRentang(rentang)} · ${jumlahHari} hari`}
          </p>
        </div>
      </header>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Catatan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{totalCatatan}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total jam kerja</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatDurasi(totalJam)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Pengguna</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{totalPengguna}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Hari</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{jumlahHari}</p>
          </CardContent>
        </Card>
      </div>

      <FilterLog awal={rentang.dari} akhir={rentang.sampai} cabang={cabang} cabangTerpilih={cabangTerpilih} role={admin.role} />

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <DataTable caption="Log absensi" columns={kolom} rows={rows} rowKey={(r) => r.id} />
          </div>
        </CardContent>
        <CardFooter>
          Edit jam tersedia untuk admin cabang. Hapus baris hanya tersedia untuk Super Admin; baris yang dihapus membuat pengguna dapat absen lagi, dan ringkasannya tersimpan di audit di bawah.
        </CardFooter>
      </Card>

      {(q.cursor || adaBerikutnya) && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
          <p>
            Menampilkan {rows.length} dari {totalCatatan} catatan
          </p>
          {adaBerikutnya ? (
            <Link href={tautanBerikutnya} className="font-medium underline underline-offset-2">
              Halaman berikutnya →
            </Link>
          ) : (
            <span>Halaman terakhir</span>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Audit penghapusan (20 terbaru)</CardTitle>
        </CardHeader>
        <CardContent>
          {auditHapus.length === 0 ? (
            <p className="text-sm text-muted">Belum ada catatan absensi yang dihapus.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {auditHapus.map((a) => (
                <li key={a.id} className="border-b border-line/70 pb-2 last:border-0">
                  <span className="tabular-nums text-muted">
                    {formatTanggal(a.dibuatPada.toISOString().slice(0, 10))} ·{" "}
                  </span>
                  {a.ringkasan}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, string> = {
    hadir: "Hadir",
    telat: "Telat",
    izin: "Izin",
    alpa: "Alpa",
    libur: "Libur",
  };
  return <span className="font-medium">{map[status] ?? status}</span>;
}

function StatusWajahLabel({ row }: { row: BarisLog }) {
  if (!row.faceStatus) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={`font-medium ${WARNA_STATUS_WAJAH[row.faceStatus]}`}>
      {LABEL_STATUS_WAJAH[row.faceStatus]}
      {row.faceJarak != null ? (
        <span className="block text-xs font-normal text-muted tabular-nums">
          jarak {row.faceJarak.toFixed(3)}
        </span>
      ) : null}
    </span>
  );
}

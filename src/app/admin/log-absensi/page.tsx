import { DataTable, type Kolom } from "@/components/ui/data-table";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
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
import { FilterLog, type BarisLog } from "./filter";
import { AksiBaris } from "./baris";

export const dynamic = "force-dynamic";

export default async function AdminLogAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string; cabang?: string }>;
}) {
  const admin = await wajibAkses("karyawan");
  const q = await searchParams;
  const rentang = bacaRentang({ dari: q.dari, sampai: q.sampai }, tanggalLokal().slice(0, 7));

  const cabangTerpilih = roleTerbatasCabang(admin.role)
    ? (admin.cabangId ?? "")
    : (q.cabang ?? "");
  const lingkup = cabangTerpilih ? { cabangId: cabangTerpilih } : {};

  const [absensi, cabang] = await Promise.all([
    db.absensi.findMany({
      where: {
        tanggal: { gte: rentang.dari, lte: rentang.sampai },
      },
      orderBy: [{ tanggal: "desc" }, { masukMenit: "asc" }],
      include: {
        user: { select: { name: true, cabang: { select: { nama: true } }, cabangId: true } },
        cycles: { orderBy: { urutan: "asc" } },
      },
    }),
    db.cabang.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  const terlihat = absensi.filter((a) => !lingkup.cabangId || a.user.cabangId === lingkup.cabangId);
  const rows: BarisLog[] = terlihat.map((a) => {
    const cycles = a.cycles.length
      ? a.cycles
      : a.masukMenit != null
        ? [{ urutan: 1, masukMenit: a.masukMenit, keluarMenit: a.keluarMenit }]
        : [];
    return {
    id: a.id,
    nama: a.user.name,
    cabang: a.user.cabang?.nama ?? "—",
    tanggal: a.tanggal,
    masuk: cycles[0]?.masukMenit ?? a.masukMenit,
    keluar: cycles.at(-1)?.keluarMenit ?? a.keluarMenit,
    status: bacaStatusAbsensi(a.status),
    menitKerja: cycles.length
      ? cycles.reduce((total, cycle) => total + (cycle.keluarMenit == null ? 0 : durasiMenit(cycle.masukMenit, cycle.keluarMenit)), 0)
      : a.masukMenit !== null && a.keluarMenit !== null ? durasiMenit(a.masukMenit, a.keluarMenit) : null,
    menitTelat: a.menitTelat,
    catatan: a.editedBy ?? null,
    faceStatus: bacaStatusWajah(a.faceStatus),
    faceJarak: a.faceJarak,
    cycles: cycles.map((cycle) => ({ urutan: cycle.urutan, masukMenit: cycle.masukMenit, keluarMenit: cycle.keluarMenit })),
  };
  });

  const jumlahHari = selisihHari(rentang.dari, rentang.sampai) + 1;
  const totalJam = rows.reduce((acc, r) => acc + (r.menitKerja ?? 0), 0);

  const kolom: Kolom<BarisLog>[] = [
    { header: "Nama", cell: (r) => r.nama, rowHeader: true },
    { header: "Cabang", cell: (r) => <span className="text-muted">{r.cabang}</span> },
    { header: "Tanggal", cell: (r) => <span className="tabular-nums">{r.tanggal}</span> },
    { header: "Cycle", cell: (r) => r.cycles.length ? <div className="space-y-0.5 tabular-nums">{r.cycles.map((cycle) => <p key={cycle.urutan}>{cycle.urutan}. {keJam(cycle.masukMenit)}–{cycle.keluarMenit == null ? "aktif" : keJam(cycle.keluarMenit)}</p>)}</div> : "—" },
    { header: "Jam kerja", cell: (r) => (r.menitKerja !== null ? formatDurasi(r.menitKerja) : "—"), numeric: true },
    { header: "Telat", cell: (r) => (r.menitTelat > 0 ? `${r.menitTelat} m` : "0"), numeric: true },
    { header: "Status", cell: (r) => <StatusLabel status={r.status} /> },
    { header: "Wajah", cell: (r) => <StatusWajahLabel row={r} /> },
    { header: "Aksi", cell: (r) => <AksiBaris row={r} canDelete={admin.role === "super_admin"} /> },
  ];

  return (
    <>
      <PageHeader title="Log Absensi" description={`${labelRentang(rentang)} · ${jumlahHari} hari`} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Catatan" value={rows.length} />
        <StatCard label="Total jam kerja" value={formatDurasi(totalJam)} />
        <StatCard label="Pengguna" value={new Set(terlihat.map((a) => a.userId)).size} />
        <StatCard label="Hari" value={jumlahHari} />
      </div>

      <FilterLog awal={rentang.dari} akhir={rentang.sampai} cabang={cabang} cabangTerpilih={cabangTerpilih} role={admin.role} />

      <Card footer="Edit jam tersedia untuk admin cabang. Hapus baris hanya tersedia untuk Super Admin; baris yang dihapus membuat pengguna dapat absen lagi.">
        <div className="overflow-x-auto">
          <DataTable caption="Log absensi" columns={kolom} rows={rows} rowKey={(r) => r.id} />
        </div>
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

import { DataTable, type Kolom } from "@/components/ui/data-table";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import type { StatusAbsensi } from "@/lib/domain";
import { bacaRentang, labelRentang } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
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
      },
    }),
    db.cabang.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  const terlihat = absensi.filter((a) => !lingkup.cabangId || a.user.cabangId === lingkup.cabangId);
  const rows: BarisLog[] = terlihat.map((a) => ({
    id: a.id,
    nama: a.user.name,
    cabang: a.user.cabang?.nama ?? "—",
    tanggal: a.tanggal,
    masuk: a.masukMenit,
    keluar: a.keluarMenit,
    status: bacaStatusAbsensi(a.status),
    menitKerja: a.masukMenit !== null && a.keluarMenit !== null ? durasiMenit(a.masukMenit, a.keluarMenit) : null,
    menitTelat: a.menitTelat,
    catatan: a.editedBy ?? null,
  }));

  const jumlahHari = selisihHari(rentang.dari, rentang.sampai) + 1;
  const totalJam = rows.reduce((acc, r) => acc + (r.menitKerja ?? 0), 0);

  const kolom: Kolom<BarisLog>[] = [
    { header: "Nama", cell: (r) => r.nama, rowHeader: true },
    { header: "Cabang", cell: (r) => <span className="text-muted">{r.cabang}</span> },
    { header: "Tanggal", cell: (r) => <span className="tabular-nums">{r.tanggal}</span> },
    { header: "Masuk", cell: (r) => (r.masuk !== null ? keJam(r.masuk) : "—"), numeric: true },
    { header: "Keluar", cell: (r) => (r.keluar !== null ? keJam(r.keluar) : "—"), numeric: true },
    { header: "Jam kerja", cell: (r) => (r.menitKerja !== null ? formatDurasi(r.menitKerja) : "—"), numeric: true },
    { header: "Telat", cell: (r) => (r.menitTelat > 0 ? `${r.menitTelat} m` : "0"), numeric: true },
    { header: "Status", cell: (r) => <StatusLabel status={r.status} /> },
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

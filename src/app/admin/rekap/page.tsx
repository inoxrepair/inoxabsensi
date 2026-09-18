import { DataTable, type Kolom } from "@/components/ui/data-table";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { roleTerbatasCabang, type StatusAbsensi } from "@/lib/domain";
import { wajibAkses } from "@/lib/session";
import {
  daftarTanggal,
  labelRentang,
  periodeTerakhir,
  persenKehadiran,
  SIMBOL_STATUS,
  totalRekap,
} from "@/lib/rekap";
import { formatDurasi, namaHari, selisihHari, tanggalLokal } from "@/lib/waktu";
import { FilterRekap } from "./filter-rekap";
import { ambilRekap, bacaLingkup, type BarisTabel } from "./data";

export const dynamic = "force-dynamic";

/** Warna teks per status, memakai aksen tema yang memang hanya untuk status. */
const WARNA_STATUS: Record<StatusAbsensi, string> = {
  hadir: "text-status-hadir",
  telat: "text-status-izin",
  izin: "text-status-izin",
  alpa: "text-status-alpa",
  libur: "text-muted",
};

/** Header "01 Sel" agar kolom tanggal tetap terbaca saat sangat sempit. */
function labelTanggal(iso: string): string {
  return `${iso.slice(8)} ${namaHari(iso, true)}`;
}

function kolomAgregat(): Kolom<BarisTabel>[] {
  return [
    { header: "Nama", cell: (r) => r.nama, rowHeader: true },
    {
      header: "Cabang",
      cell: (r) => <span className="text-muted">{r.cabang}</span>,
    },
    { header: "Hadir", cell: (r) => r.hadir, numeric: true },
    {
      header: "Telat",
      cell: (r) => (
        <>
          <span className={r.telat === 0 ? "text-muted" : undefined}>
            {r.telat} kali
          </span>
          <span className="block text-xs font-normal text-muted">
            {r.menitTelat} menit terlambat
          </span>
        </>
      ),
      numeric: true,
    },
    { header: "Izin", cell: (r) => r.izin, numeric: true },
    { header: "Alpa", cell: (r) => r.alpa, numeric: true },
    {
      header: "Jam kerja",
      cell: (r) => (r.menitKerja ? formatDurasi(r.menitKerja) : "—"),
      numeric: true,
    },
    {
      header: "Kurang jam",
      cell: (r) =>
        r.kekuranganMenit > 0 ? formatDurasi(r.kekuranganMenit) : "—",
      numeric: true,
    },
  ];
}

function kolomTanggal(tanggal: string[]): Kolom<BarisTabel>[] {
  return tanggal.map((iso) => ({
    header: labelTanggal(iso),
    cell: (r) => {
      const status = r.statusHarian.get(iso);
      if (!status) return <span className="text-muted">·</span>;
      return (
        <span
          className={`font-medium ${WARNA_STATUS[status]}`}
          title={`${labelTanggal(iso)}: ${status}`}
        >
          {SIMBOL_STATUS[status]}
        </span>
      );
    },
    numeric: true,
  }));
}

const LEGENDA: { status: StatusAbsensi; teks: string }[] = [
  { status: "hadir", teks: "Hadir" },
  { status: "telat", teks: "Telat" },
  { status: "izin", teks: "Izin" },
  { status: "alpa", teks: "Alpa" },
  { status: "libur", teks: "Libur" },
];

function LegendStatus() {
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {LEGENDA.map((l) => (
        <li key={l.status} className="inline-flex items-center gap-1.5">
          <span className={`font-semibold ${WARNA_STATUS[l.status]}`}>
            {SIMBOL_STATUS[l.status]}
          </span>
          {l.teks}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="font-semibold">·</span>
        Belum ada catatan
      </li>
    </ul>
  );
}

export default async function AdminRekapPage({
  searchParams,
}: {
  searchParams: Promise<{
    periode?: string;
    cabang?: string;
    dari?: string;
    sampai?: string;
  }>;
}) {
  const admin = await wajibAkses("rekap");
  const q = await searchParams;
  const lingkup = bacaLingkup(admin, q);

  const [baris, cabang] = await Promise.all([
    ambilRekap(lingkup),
    db.cabang.findMany({
      where: roleTerbatasCabang(admin.role)
        ? { id: admin.cabangId ?? "-" }
        : {},
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const total = totalRekap(baris);
  const persen = persenKehadiran(total);
  const jumlahHari = selisihHari(lingkup.dari, lingkup.sampai) + 1;
  const adaData = total.hadir + total.izin + total.alpa > 0;

  const tanggal = daftarTanggal(lingkup);
  const kolom: Kolom<BarisTabel>[] = [
    ...kolomAgregat(),
    ...kolomTanggal(tanggal),
  ];

  const paramExport = new URLSearchParams(
    lingkup.kustom
      ? { dari: lingkup.dari, sampai: lingkup.sampai }
      : { periode: lingkup.dari.slice(0, 7) },
  );
  if (lingkup.cabangId) paramExport.set("cabang", lingkup.cabangId);

  return (
    <>
      <PageHeader
        title="Rekap Absensi"
        description={`${labelRentang(lingkup)} · ${jumlahHari} hari`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Hadir"
          value={total.hadir}
          hint={total.telat > 0 ? `${total.telat} di antaranya telat` : "tanpa keterlambatan"}
        />
        <StatCard
          label="Akumulasi telat"
          value={total.menitTelat > 0 ? formatDurasi(total.menitTelat) : "0j"}
          hint={`${total.menitTelat} menit`}
        />
        <StatCard label="Izin / Alpa" value={`${total.izin} / ${total.alpa}`} />
        <StatCard
          label="Kehadiran"
          value={`${persen}%`}
          hint={`Total ${formatDurasi(total.menitKerja)}`}
        />
        {total.kekuranganMenit > 0 ? (
          <StatCard
            label="Kekurangan jam"
            value={formatDurasi(total.kekuranganMenit)}
            hint="Hanya shift fleksibel dengan target minimum"
          />
        ) : null}
      </div>

      <div className="mt-6">
        <FilterRekap
          periode={lingkup.dari.slice(0, 7)}
          daftarPeriode={periodeTerakhir(tanggalLokal().slice(0, 7), 12)}
          cabangId={lingkup.cabangId}
          daftarCabang={cabang}
          rentang={lingkup}
          urlExport={`/admin/rekap/export?${paramExport}`}
          labelExport="Unduh Excel"
        />

        <LegendStatus />

        <Card
          footer={
            adaData
              ? "Angka di bawah kolom Telat adalah akumulasi keterlambatan setelah dikurangi toleransi shift. Jam kerja hanya dari hari yang sudah absen keluar. Kolom tanggal memakai simbol H/T/I/A/L; titik berarti belum ada catatan."
              : "Belum ada catatan absensi pada rentang ini."
          }
        >
          <DataTable
            caption={`Rekap absensi ${labelRentang(lingkup)}`}
            columns={kolom}
            rows={baris}
            rowKey={(r) => r.userId}
          />
        </Card>
      </div>
    </>
  );
}

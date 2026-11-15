import { DataTable, type Kolom } from "@/components/ui/data-table";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { wajibAkses } from "@/lib/session";
import {
  daftarTanggal,
  labelRentang,
  periodeTerakhir,
  persenKehadiran,
  SIMBOL_HARI,
  LABEL_HARI,
  totalRekap,
  type KeadaanHari,
} from "@/lib/rekap";
import { formatDurasi, namaHari, selisihHari, tanggalLokal } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";
import { FilterRekap } from "./filter-rekap";
import { ambilRekap, bacaLingkup, type BarisTabel } from "./data";

export const dynamic = "force-dynamic";

/** Warna teks per keadaan, memakai aksen tema yang memang hanya untuk status. */
const WARNA_STATUS: Record<KeadaanHari, string> = {
  hadir: "text-status-hadir",
  telat: "text-status-izin",
  izin: "text-status-izin",
  alpa: "text-status-alpa",
  libur: "text-muted",
  off: "text-muted",
};

/** Header kolom tanggal: dd/mm/yyyy. Nama hari hanya di tooltip. */
function labelTanggal(iso: string): string {
  return formatTanggal(iso);
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
    {
      header: "Toleransi",
      cell: (r) => (
        <>
          <span className={r.menitToleransi === 0 ? "text-muted" : undefined}>
            {r.menitToleransi} m
          </span>
          <span className="block text-xs font-normal text-muted">
            dalam toleransi
          </span>
        </>
      ),
      numeric: true,
    },
    {
      header: "Total telat",
      cell: (r) => (
        <>
          <span className={r.menitKotor === 0 ? "text-muted" : undefined}>
            {r.menitKotor} m
          </span>
          <span className="block text-xs font-normal text-muted">
            kotor tanpa potongan
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
    {
      header: "Belum keluar",
      cell: (r) => (r.belumKeluar > 0 ? r.belumKeluar : "—"),
      numeric: true,
    },
  ];
}

function kolomTanggal(tanggal: string[]): Kolom<BarisTabel>[] {
  return tanggal.map((iso) => ({
    header: labelTanggal(iso),
    cell: (r) => {
      const keadaan = r.statusHarian.get(iso);
      // Karyawan yang jadwalnya shift Full diberi penanda F kecil agar
      // keterangan pagi-siang tetap terlihat, termasuk saat hadir/telat.
      const penuh = r.jadwalFull.has(iso);

      if (!keadaan) {
        return penuh ? (
          <span className="font-medium text-muted" title="Shift Full, belum ada data">
            F
          </span>
        ) : (
          <span className="text-muted">·</span>
        );
      }

      const simbol = penuh
        ? `F${SIMBOL_HARI[keadaan]}`
        : SIMBOL_HARI[keadaan];
      return (
        <span
          className={`font-medium ${WARNA_STATUS[keadaan]}`}
          title={`${labelTanggal(iso)} (${namaHari(iso, true)}): ${penuh ? "Shift Full · " : ""}${LABEL_HARI[keadaan]}`}
        >
          {simbol}
        </span>
      );
    },
    numeric: true,
  }));
}

const LEGENDA: { keadaan: KeadaanHari; teks: string }[] = [
  { keadaan: "hadir", teks: "Hadir" },
  { keadaan: "telat", teks: "Telat" },
  { keadaan: "izin", teks: "Izin" },
  { keadaan: "alpa", teks: "Alpa (ada jadwal, tanpa absensi)" },
  { keadaan: "libur", teks: "Libur" },
  { keadaan: "off", teks: "Off (tanpa jadwal)" },
];

function LegendStatus() {
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {LEGENDA.map((l) => (
        <li key={l.keadaan} className="inline-flex items-center gap-1.5">
          <span className={`font-semibold ${WARNA_STATUS[l.keadaan]}`}>
            {SIMBOL_HARI[l.keadaan]}
          </span>
          {l.teks}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="font-semibold">F</span>
        Contoh: FH = hadir pada jadwal shift Full (pagi-siang)
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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rekap Absensi</h1>
          <p className="mt-1 text-sm text-muted">
            {`${labelRentang(lingkup)} · ${jumlahHari} hari`}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Hadir</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{total.hadir}</p>
            <p className="mt-1 text-xs text-muted">{total.telat > 0 ? `${total.telat} di antaranya telat` : "tanpa keterlambatan"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Akumulasi telat</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{total.menitTelat > 0 ? formatDurasi(total.menitTelat) : "0j"}</p>
            <p className="mt-1 text-xs text-muted">{`${total.menitTelat} menit setelah toleransi`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Dalam toleransi</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {total.menitToleransi > 0
                ? formatDurasi(total.menitToleransi)
                : "0j"}
            </p>
            <p className="mt-1 text-xs text-muted">{`${total.menitToleransi} menit diampuni`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total telat</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {total.menitKotor > 0 ? formatDurasi(total.menitKotor) : "0j"}
            </p>
            <p className="mt-1 text-xs text-muted">{`${total.menitKotor} menit kotor`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Izin / Alpa</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{`${total.izin} / ${total.alpa}`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Kehadiran</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{`${persen}%`}</p>
            <p className="mt-1 text-xs text-muted">{`Total ${formatDurasi(total.menitKerja)}`}</p>
          </CardContent>
        </Card>
        {total.kekuranganMenit > 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted">Kekurangan jam</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{formatDurasi(total.kekuranganMenit)}</p>
              <p className="mt-1 text-xs text-muted">Hanya shift fleksibel dengan target minimum</p>
            </CardContent>
          </Card>
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

        <Card>
          <CardContent>
            <DataTable
              caption={`Rekap absensi ${labelRentang(lingkup)}`}
              columns={kolom}
              rows={baris}
              rowKey={(r) => r.userId}
            />
          </CardContent>
          <CardFooter>
            {adaData
              ? "Kolom Telat adalah akumulasi keterlambatan setelah dikurangi toleransi shift. Kolom Toleransi adalah akumulasi menit dalam toleransi (diampuni). Kolom Total telat adalah akumulasi keterlambatan kotor dari jam mulai shift tanpa potongan. Jam kerja hanya dari hari yang sudah absen keluar. Kolom tanggal memakai simbol H/T/I/A/L; titik berarti belum ada catatan."
              : "Belum ada catatan absensi pada rentang ini."}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

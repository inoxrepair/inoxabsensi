import { PageHeader, StatCard } from "@/components/ui/primitives";
import { formatRupiah } from "@/lib/format";
import { labelPeriode, periodeTerakhir, periodeValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { ambilInsentifAdmin } from "./actions";
import { TombolSinkron } from "./tombol-sinkron";

export const dynamic = "force-dynamic";

export default async function AdminInsentifPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const admin = await wajibAkses("insentif");
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  const data = await ambilInsentifAdmin(periode);

  const totalInsentif = data.reduce(
    (a: number, b: { jumlah: number }) => a + b.jumlah,
    0,
  );
  const totalTransaksi = data.reduce(
    (a: number, b: { jumlahTransaksi: number }) => a + b.jumlahTransaksi,
    0,
  );

  const superAdmin = admin.role === "super_admin";

  const deskripsi = (
    <>
      Data insentif karyawan dari inox.my.id (laporan insentif).{" "}
      {superAdmin ? (
        <>
          Sinkronisasi manual via tombol di bawah. Data per karyawan
          per periode "yyyy-mm".
        </>
      ) : (
        <>Lihat insentif tim cabang Anda.</>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="Insentif"
        description={deskripsi}
        action={superAdmin && <TombolSinkron periode={periode} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total insentif" value={formatRupiah(totalInsentif)} />
        <StatCard
          label="Total transaksi"
          value={totalTransaksi}
          hint="Baris laporan inox.my.id"
        />
        <StatCard
          label="Karyawan tercatat"
          value={data.length}
        />
        <StatCard
          label="Periode"
          value={labelPeriode(periode)}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 items-end">
        <form className="flex gap-2">
          <label className="text-sm text-muted flex items-center gap-2">
            Periode{" "}
            <input
              name="periode"
              type="month"
              defaultValue={periode}
              className="ml-2 rounded border bg-paper px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded border bg-paper px-3 py-1 text-sm hover:bg-muted transition"
          >
            Lihat
          </button>
        </form>
      </div>

      <div className="mt-6">
        {superAdmin ? (
          <table className="w-full text-left border-collapse border border-line">
            <thead>
              <tr className="border-b border-line bg-muted/50">
                <th className="p-3 text-sm font-medium">Karyawan</th>
                <th className="p-3 text-sm font-medium">Cabang</th>
                <th className="p-3 text-sm font-medium text-right">
                  Jumlah Insentif
                </th>
                <th className="p-3 text-sm font-medium text-right">
                  Transaksi
                </th>
                <th className="p-3 text-sm font-medium">Sinkron Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted">
                    Belum ada data insentif untuk periode{" "}
                    <strong>{labelPeriode(periode)}</strong>. Klik{" "}
                    <strong>Sinkron Insentif</strong> untuk ambil data dari
                    inox.my.id.
                  </td>
                </tr>
              ) : (
                data.map((d: any) => (
                  <tr key={d.id} className="border-b border-line hover:bg-muted/30">
                    <td className="p-3 text-sm">{d.user.name}</td>
                    <td className="p-3 text-sm">
                      {d.user.cabang?.nama ?? "—"}
                    </td>
                    <td className="p-3 text-sm text-right font-medium">
                      {formatRupiah(d.jumlah)}
                    </td>
                    <td className="p-3 text-sm text-center">{d.jumlahTransaksi}</td>
                    <td className="p-3 text-sm text-muted">
                      {d.sinkronPada ? new Date(d.sinkronPada).toLocaleString("id-ID") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="rounded-xl border border-line bg-paper p-6">
            <h2 className="text-sm font-semibold mb-2">
              Insentif Tim Cabang - {labelPeriode(periode)}
            </h2>
            {data.length === 0 ? (
              <p className="text-sm text-muted">
                Belum ada data insentif untuk periode ini.
              </p>
            ) : (
              <table className="w-full text-left border-collapse mt-3">
                <thead>
                  <tr className="border-b border-line bg-muted/50">
                    <th className="p-2 text-sm font-medium">Karyawan</th>
                    <th className="p-2 text-sm font-medium text-right">
                      Insentif
                    </th>
                    <th className="p-2 text-sm font-medium text-right">
                      Transaksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d: any) => (
                    <tr key={d.id} className="border-b border-line">
                      <td className="p-2 text-sm">{d.user.name}</td>
                      <td className="p-2 text-sm text-right font-medium">
                        {formatRupiah(d.jumlah)}
                      </td>
                      <td className="p-2 text-sm text-center">
                        {d.jumlahTransaksi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-muted/30 p-4 text-sm text-muted">
        <p className="font-semibold mb-1">Catatan:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Data diambil dari endpoint <code>reports/incentive-line-orders</code>
            di inox.my.id (read-only, tidak mengubah data di sana).
          </li>
          <li>
            Pencocokan karyawan dilakukan berdasarkan nama
            (<code>service_staff</code> ↔ nama pengguna di iNox Absensi).
          </li>
          <li>
            Nilai insentif di Payroll diambil dari tabel ini; sinkronisasi
            adalah satu-satunya sumber nilai tersebut.
          </li>
          <li>
            Sinkronisasi tidak realtime; jalankan tombol di atas (atau cron)
            sebelum membuat rekap penggajian.
          </li>
          <li>
            Super Admin melihat semua karyawan; Admin Cabang hanya tim
            cabangnya.
          </li>
        </ul>
      </div>
    </>
  );
}

import { PageHeader, StatCard } from "@/components/ui/primitives";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { bacaRentangGajian, labelPeriode, periodeValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { ambilInsentifAdmin, ambilPemetaanInsentif, ambilPenggunaAktif, hapusPemetaanInsentif } from "./actions";
import { FilterInsentif } from "./filter-insentif";
import { TombolSinkron } from "./tombol-sinkron";

export const dynamic = "force-dynamic";

export default async function AdminInsentifPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; dari?: string; sampai?: string }>;
}) {
  const admin = await wajibAkses("insentif");
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  // Rentang transaksi: yang dipilih di filter, dijepit ke siklus gajian
  // bulan itu (28 bulan sebelumnya s.d. 27 bulan periode); bila tidak
  // dipilih, dipakai siklus gajian default bulan itu. Tabel di bawah
  // menjumlahkan baris transaksi tersimpan dalam rentang ini.
  const rentang = bacaRentangGajian(
    { dari: q.dari, sampai: q.sampai, periode },
    bulanIni,
  );

  const data = await ambilInsentifAdmin(rentang.dari, rentang.sampai);

  const superAdmin = admin.role === "super_admin";
  const pemetaan = superAdmin ? await ambilPemetaanInsentif() : [];
  const pengguna = superAdmin ? await ambilPenggunaAktif() : [];

  const totalInsentif = data.reduce(
    (a: number, b: { jumlah: number }) => a + b.jumlah,
    0,
  );
  const totalTransaksi = data.reduce(
    (a: number, b: { jumlahTransaksi: number }) => a + b.jumlahTransaksi,
    0,
  );

  const deskripsi = (
    <>
      Data insentif karyawan dari inox.my.id (laporan insentif).{" "}
      {superAdmin ? (
        <>
          Sinkronisasi manual via tombol di bawah. Data per karyawan,
          dijumlahkan untuk rentang yang dipilih.
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
        action={superAdmin && <TombolSinkron periode={periode} dari={rentang.dari} sampai={rentang.sampai} pengguna={pengguna} />}
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
          hint={`${formatTanggal(rentang.dari)} – ${formatTanggal(rentang.sampai)}`}
        />
      </div>

      <FilterInsentif periode={periode} dari={rentang.dari} sampai={rentang.sampai} />

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
                <th className="p-3 text-sm font-medium">Rentang</th>
                <th className="p-3 text-sm font-medium">Sinkron Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted">
                    Belum ada data insentif untuk periode{" "}
                    <strong>{labelPeriode(periode)}</strong>. Klik{" "}
                    <strong>Sinkron Insentif</strong> untuk ambil data dari
                    inox.my.id.
                  </td>
                </tr>
              ) : (
                data.map((d: any) => (
                  <tr key={d.userId} className="border-b border-line hover:bg-muted/30">
                    <td className="p-3 text-sm">{d.user.name}</td>
                    <td className="p-3 text-sm">
                      {d.user.cabangNama ?? "—"}
                    </td>
                    <td className="p-3 text-sm text-right font-medium">
                      {formatRupiah(d.jumlah)}
                    </td>
                    <td className="p-3 text-sm text-center">{d.jumlahTransaksi}</td>
                    <td className="p-3 text-sm text-muted">
                      {d.tanggalAwal && d.tanggalAkhir
                        ? `${formatTanggal(d.tanggalAwal)}–${formatTanggal(d.tanggalAkhir)}`
                        : "—"}
                    </td>
                    <td className="p-3 text-sm text-muted">
                      {d.sinkronPada ? new Date(d.sinkronPada).toLocaleString("id-ID") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6">
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
                    <th className="p-2 text-sm font-medium">Rentang</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d: any) => (
                    <tr key={d.userId} className="border-b border-line">
                      <td className="p-2 text-sm">{d.user.name}</td>
                      <td className="p-2 text-sm text-right font-medium">
                        {formatRupiah(d.jumlah)}
                      </td>
                      <td className="p-2 text-sm text-center">
                        {d.jumlahTransaksi}
                      </td>
                      <td className="p-2 text-sm text-muted">
                        {d.tanggalAwal && d.tanggalAkhir
                          ? `${formatTanggal(d.tanggalAwal)}–${formatTanggal(d.tanggalAkhir)}`
                          : "—"}
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
            Sinkron menarik transaksi dalam rentang Dari–Sampai yang
            dipilih di filter di atas (seperti filter Log Absensi).
            Bila tidak dipilih, dipakai siklus gajian default: 28 bulan
            sebelumnya s.d. 27 bulan periode (mis. November 2026 =
            28/10/2026–27/11/2026). Transaksi disimpan per baris
            (dengan tanggalnya), jadi tabel di atas menjumlahkan
            rentang yang dipilih — ganti rentang tidak perlu sinkron
            ulang. Sinkron ulang pada rentang yang sama mengganti baris
            di rentang itu (tidak menggandakan).
          </li>
          <li>
            Pencocokan karyawan dilakukan berdasarkan nama
            (<code>service_staff</code> ↔ nama pengguna di iNox Absensi).
            Nama yang tidak cocok muncul setelah sinkron beserta pilihan
            akun — hubungkan sekali, sinkron berikutnya otomatis memakai
            pemetaan itu (lihat daftar pemetaan di bawah).
          </li>
          <li>
            Nilai insentif di Payroll diambil dari baris transaksi ini,
            mengikuti rentang tanggal yang dipilih di Payroll;
            sinkronisasi adalah satu-satunya sumber nilai tersebut.
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

      {superAdmin ? (
        <div className="mt-8 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
          <h2 className="text-sm font-semibold mb-1">
            Pemetaan Nama iNOX → Akun ({pemetaan.length})
          </h2>
          <p className="text-sm text-muted mb-3">
            Nama iNOX di bawah ini sudah dipasangkan ke akun karyawan dan
            dipakai otomatis di setiap sinkron. Hapus pemetaan bila nama itu
            seharusnya tidak lagi terhubung ke akun tersebut.
          </p>
          {pemetaan.length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada pemetaan. Nama yang tidak cocok akan muncul beserta
              pilihan akun setelah Anda menekan Sinkron.
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-muted/50">
                  <th className="p-2 text-sm font-medium">Nama di iNOX</th>
                  <th className="p-2 text-sm font-medium">Akun karyawan</th>
                  <th className="p-2 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pemetaan.map((p: any) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="p-2 text-sm">{p.namaInox}</td>
                    <td className="p-2 text-sm">{p.user.name}</td>
                    <td className="p-2 text-sm text-right">
                      <form action={hapusPemetaanInsentif}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-2 py-1 text-sm hover:bg-muted transition"
                        >
                          Hapus
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </>
  );
}

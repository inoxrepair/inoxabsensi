import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { ambilInsentifTransaksiRentang } from "@/lib/insentif";
import { bacaRentangGajian, labelPeriode, periodeValid } from "@/lib/rekap";
import { wajibLogin } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { FilterInsentifKaryawan } from "./filter-insentif-karyawan";

export const dynamic = "force-dynamic";

export default async function KaryawanInsentifPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; dari?: string; sampai?: string }>;
}) {
  const sesi = await wajibLogin();
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  // Rentang sama seperti menu Insentif admin: siklus gajian bulan itu
  // (28 bulan sebelumnya s.d. 27 bulan periode), dijepit bila Dari/Sampai
  // dipilih di filter.
  const rentang = bacaRentangGajian(
    { dari: q.dari, sampai: q.sampai, periode },
    bulanIni,
  );

  // Baca baris transaksi dalam rentang, lalu saring ke karyawan yang login
  // saja — insentif karyawan lain tidak pernah dirender di halaman ini.
  const semua = await ambilInsentifTransaksiRentang(rentang.dari, rentang.sampai);
  const baris = semua
    .filter((b) => b.userId === sesi.id)
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  const totalInsentif = baris.reduce((a, b) => a + b.jumlah, 0);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Insentif Saya</h1>
        <p className="mt-1 text-sm text-muted">
          Insentif Anda dari laporan inox.my.id, {labelPeriode(periode)} ({formatTanggal(rentang.dari)}–{formatTanggal(rentang.sampai)}).
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total insentif</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(totalInsentif)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Jumlah transaksi</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{baris.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Periode</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{labelPeriode(periode)}</p>
            <p className="mt-1 text-xs text-muted">{formatTanggal(rentang.dari)} – {formatTanggal(rentang.sampai)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <FilterInsentifKaryawan
          periode={periode}
          dari={rentang.dari}
          sampai={rentang.sampai}
          kustom={rentang.kustom}
        />
      </div>

      {baris.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center">
          <p className="text-sm font-medium">
            Belum ada insentif pada {labelPeriode(periode)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Insentif Anda akan muncul di sini setelah admin menyinkronkan
            data dari inox.my.id untuk rentang{" "}
            {formatTanggal(rentang.dari)}–{formatTanggal(rentang.sampai)}.
          </p>
        </div>
      ) : (
        // Jendela scroll: daftar dibatasi tingginya supaya halaman tidak
        // meluber memanjang saat transaksinya banyak; gulir di dalam kartu.
        <div className="mt-4 max-h-[55vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
          <ul className="divide-y divide-line">
            {baris.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.productName}</p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatTanggal(b.tanggal)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatRupiah(b.jumlah)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Data insentif diambil dari laporan inox.my.id dan disinkronkan oleh
        admin. Bila insentif Anda belum muncul, hubungi admin.
      </p>
    </>
  );
}

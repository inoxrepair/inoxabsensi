import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatRupiah, formatTanggal } from "@/lib/format";
import {
  TARIF_POTONGAN_TELAT_PER_MENIT,
  TARIF_TUNJANGAN_MAKAN_PER_HARI,
} from "@/lib/payroll";
import { hitungPayroll } from "@/lib/payroll-data";
import {
  labelPeriode,
  periodeTerakhir,
  periodeValid,
} from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { FilterPayroll } from "./filter-payroll";
import { TabelPayroll } from "./tabel-payroll";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; cabang?: string; dari?: string; sampai?: string }>;
}) {
  const admin = await wajibAkses("payroll");
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  // Admin cabang hanya melihat cabangnya sendiri: parameter cabang dari
  // URL diabaikan, supaya tidak bisa mengintip cabang lain. Super admin
  // bebas memilih cabang (kosong = semua cabang).
  const superAdmin = admin.role === "super_admin";
  const cabangId = superAdmin ? (q.cabang ?? "") : (admin.cabangId ?? "");
  const filterCabang = cabangId ? { cabangId } : {};

  // Satu sumber kebenaran dengan ekspor PDF (lib/payroll-data): angka di
  // layar dan di PDF dihitung dari fungsi yang sama.
  const { baris, total, jendela, rentang } = await hitungPayroll({
    periode,
    cabangId,
    dari: q.dari,
    sampai: q.sampai,
    bulanIni,
  });
  const cabang = await db.cabang.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });
  // Admin cabang hanya ditawari cabangnya sendiri di filter (daftar satu
  // cabang menyembunyikan dropdown cabang di FilterPayroll).
  const daftarCabang = superAdmin
    ? cabang
    : cabang.filter((c) => c.id === admin.cabangId);

  // Tautan ekspor mengikuti filter yang sedang tampil (periode + cabang +
  // rentang kustom bila ada).
  const eksporParams = new URLSearchParams({ periode });
  if (cabangId) eksporParams.set("cabang", cabangId);
  if (jendela.kustom) {
    eksporParams.set("dari", jendela.dari);
    eksporParams.set("sampai", jendela.sampai);
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-muted">
            {`Komponen gaji periode ${labelPeriode(periode)} (${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}). ${superAdmin ? "Gaji pokok, tunjangan, dan kasbon dapat diubah super admin; " : "Hanya dapat dilihat — perubahan angka gaji tetap super admin; "}tunjangan makan, potongan telat, dan insentif dihitung otomatis.${jendela.kustom ? ` Hitungan hadir/telat dibatasi ${formatTanggal(jendela.dari)}–${formatTanggal(jendela.sampai)}.` : ""}`}
          </p>
        </div>
        <a
          href={`/admin/payroll/ekspor?${eksporParams.toString()}`}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
          title="Unduh laporan payroll periode ini (PDF)"
        >
          Ekspor PDF
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total dibayarkan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.diterima)}</p>
            <p className="mt-1 text-xs text-muted">Setelah potongan &amp; kasbon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Gaji pokok</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.gajiPokok)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Tunjangan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.tunjangan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Tunjangan makan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.tunjanganMakan)}</p>
            <p className="mt-1 text-xs text-muted">{`${formatRupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} / hari hadir`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Potongan / Kasbon</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.potonganTelat + total.kasbon)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Insentif</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatRupiah(total.insentif)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <FilterPayroll
          periode={periode}
          daftarPeriode={periodeTerakhir(bulanIni, 12)}
          cabangId={cabangId}
          cabang={daftarCabang}
          jendela={jendela}
          batas={rentang}
        />

        {superAdmin || admin.role === "admin_cabang" ? (
          <TabelPayroll
            periode={periode}
            baris={baris}
            bolehUbah={superAdmin}
            infoJendela={
              jendela.kustom
                ? `Tunjangan makan, potongan telat, insentif, lembur, gaji pokok fleksibel, dan gaji pokok harian dihitung dari ${formatTanggal(jendela.dari)}–${formatTanggal(jendela.sampai)}; komponen lain tetap sebulan penuh.`
                : undefined
            }
            rentangKustom={jendela.kustom ? jendela : undefined}
          />
        ) : (
          <p className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6 text-sm text-muted">
            Hanya super admin dapat melihat dan mengubah payroll.
          </p>
        )}
      </div>
    </>
  );
}

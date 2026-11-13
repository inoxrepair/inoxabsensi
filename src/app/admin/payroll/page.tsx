import { PageHeader, StatCard } from "@/components/ui/primitives";
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

  // Permission default saat ini hanya memberi menu Payroll ke super admin.
  // Guard eksplisit dipertahankan agar bila permission tabel berubah, admin
  // cabang tetap tidak dapat membaca maupun mengedit angka gaji.
  const superAdmin = admin.role === "super_admin";
  const cabangId = superAdmin ? (q.cabang ?? "") : "";
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
      <PageHeader
        title="Payroll"
        description={`Komponen gaji periode ${labelPeriode(periode)} (${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}). Gaji pokok, tunjangan, dan kasbon dapat diubah super admin; tunjangan makan, potongan telat, dan insentif dihitung otomatis.${jendela.kustom ? ` Hitungan hadir/telat dibatasi ${formatTanggal(jendela.dari)}–${formatTanggal(jendela.sampai)}.` : ""}`}
        action={
          superAdmin && (
            <a
              href={`/admin/payroll/ekspor?${eksporParams.toString()}`}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
              title="Unduh laporan payroll periode ini (PDF)"
            >
              Ekspor PDF
            </a>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total dibayarkan"
          value={formatRupiah(total.diterima)}
          hint="Setelah potongan & kasbon"
        />
        <StatCard label="Gaji pokok" value={formatRupiah(total.gajiPokok)} />
        <StatCard label="Tunjangan" value={formatRupiah(total.tunjangan)} />
        <StatCard
          label="Tunjangan makan"
          value={formatRupiah(total.tunjanganMakan)}
          hint={`${formatRupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} / hari hadir`}
        />
        <StatCard
          label="Potongan / Kasbon"
          value={formatRupiah(total.potonganTelat + total.kasbon)}
        />
        <StatCard label="Insentif" value={formatRupiah(total.insentif)} />
      </div>

      <div className="mt-6">
        <FilterPayroll
          periode={periode}
          daftarPeriode={periodeTerakhir(bulanIni, 12)}
          cabangId={cabangId}
          cabang={cabang}
          jendela={jendela}
          batas={rentang}
        />

        {superAdmin ? (
          <TabelPayroll
            periode={periode}
            baris={baris}
            infoJendela={
              jendela.kustom
                ? `Tunjangan makan, potongan telat, insentif, lembur, dan gaji pokok fleksibel dihitung dari ${formatTanggal(jendela.dari)}–${formatTanggal(jendela.sampai)}; komponen lain tetap sebulan penuh.`
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

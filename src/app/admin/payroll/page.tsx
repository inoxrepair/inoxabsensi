import { PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { totalPayroll } from "@/lib/payroll";
import {
  labelPeriode,
  periodeTerakhir,
  periodeValid,
} from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { FilterPayroll } from "./filter-payroll";
import { TabelPayroll, type BarisPayroll } from "./tabel-payroll";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; cabang?: string }>;
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

  const [karyawan, payroll, cabang] = await Promise.all([
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...filterCabang },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, cabang: { select: { nama: true } } },
    }),
    db.payroll.findMany({
      where: { periode, user: { aktif: true, ...filterCabang } },
    }),
    db.cabang.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const peta = new Map(payroll.map((p) => [p.userId, p]));
  const baris: BarisPayroll[] = karyawan.map((k) => {
    const p = peta.get(k.id);
    return {
      userId: k.id,
      nama: k.name,
      cabang: k.cabang?.nama ?? "—",
      gajiPokok: p?.gajiPokok ?? 0,
      tunjangan: p?.tunjangan ?? 0,
      potonganTelat: p?.potonganTelat ?? 0,
      kasbon: p?.kasbon ?? 0,
    };
  });

  const total = totalPayroll(baris);

  return (
    <>
      <PageHeader
        title="Payroll"
        description={`Komponen gaji periode ${labelPeriode(periode)}. Semua nilai dapat diubah super admin.`}
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
          label="Potongan / Kasbon"
          value={formatRupiah(total.potonganTelat + total.kasbon)}
        />
      </div>

      <div className="mt-6">
        <FilterPayroll
          periode={periode}
          daftarPeriode={periodeTerakhir(bulanIni, 12)}
          cabangId={cabangId}
          cabang={cabang}
        />

        {superAdmin ? (
          <TabelPayroll periode={periode} baris={baris} />
        ) : (
          <p className="rounded-xl border border-line bg-paper p-6 text-sm text-muted">
            Hanya super admin dapat melihat dan mengubah payroll.
          </p>
        )}
      </div>
    </>
  );
}

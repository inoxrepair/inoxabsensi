import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { hitungPayroll } from "@/lib/payroll-data";
import {
  labelPeriode,
  periodeTerakhir,
  periodeValid,
} from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import {
  ambilSlipPeriode,
  gabungkanBarisSlip,
} from "@/lib/slip-gaji";
import { tanggalLokal } from "@/lib/waktu";
import { FilterSlip } from "./filter-slip";
import { NavigasiSlip } from "./navigasi-slip";
import { TabelSlip } from "./tabel-slip";

export const dynamic = "force-dynamic";

export default async function AdminSlipGajiPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; cabang?: string }>;
}) {
  const admin = await wajibAkses("slip-gaji");
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  // Admin cabang hanya melihat cabangnya sendiri: parameter cabang dari
  // URL diabaikan, supaya tidak bisa mengintip cabang lain. Super admin
  // bebas memilih cabang (kosong = semua cabang).
  const superAdmin = admin.role === "super_admin";
  const cabangId = superAdmin ? (q.cabang ?? "") : (admin.cabangId ?? "");

  // Satu sumber kebenaran dengan halaman Payroll dan ekspor PDF: angka
  // dihitung dari hitungPayroll yang sama; snapshot hanya membekukannya
  // (kecuali tunjangan makan yang dinamis mengikuti pengaturan saat ini).
  const { baris, total, rentang } = await hitungPayroll({
    periode,
    cabangId,
    bulanIni,
  });
  const snapshots = await ambilSlipPeriode(periode, cabangId || undefined);
  const gabungan = gabungkanBarisSlip(baris, snapshots);
  const cabang = await db.cabang.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });
  // Admin cabang hanya ditawari cabangnya sendiri di filter (daftar satu
  // cabang menyembunyikan dropdown cabang di FilterSlip).
  const daftarCabang = superAdmin
    ? cabang
    : cabang.filter((c) => c.id === admin.cabangId);

  const jumlahDibuat = gabungan.filter((r) => r.status !== "belum").length;
  const jumlahDibayar = gabungan.filter((r) => r.status === "dibayar").length;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Slip Gaji</h1>
          <p className="mt-1 text-sm text-muted">
            {superAdmin
              ? `Daftar slip gaji periode ${labelPeriode(periode)} (${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}). Buat slip untuk membekukan angka periode ini — kecuali tunjangan makan yang mengikuti pengaturan saat ini; tandai dibayar setelah gaji dibayarkan.`
              : `Daftar slip gaji periode ${labelPeriode(periode)} (${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}). Hanya dapat dilihat — pembuatan slip dan tanda dibayar tetap super admin.`}
          </p>
        </div>
      </header>

      <NavigasiSlip aktif="daftar" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Karyawan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {gabungan.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Slip dibuat</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {jumlahDibuat}
            </p>
            <p className="mt-1 text-xs text-muted">
              {`dari ${gabungan.length} karyawan`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Sudah dibayar</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {jumlahDibayar}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total diterima</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatRupiah(total.diterima)}
            </p>
            <p className="mt-1 text-xs text-muted">Hitungan periode ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <FilterSlip
          periode={periode}
          daftarPeriode={periodeTerakhir(bulanIni, 12)}
          cabangId={cabangId}
          cabang={daftarCabang}
        />

        {superAdmin || admin.role === "admin_cabang" ? (
          <TabelSlip
            periode={periode}
            baris={gabungan}
            bolehUbah={superAdmin}
            rentang={rentang}
          />
        ) : (
          <p className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6 text-sm text-muted">
            Hanya super admin dapat melihat slip gaji.
          </p>
        )}
      </div>
    </>
  );
}

import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { labelPeriode, periodeTerakhir, periodeValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import {
  ambilRiwayatSlip,
  LABEL_STATUS_SLIP,
  petaNamaUser,
  tanggalSlip,
  type StatusSlipTersimpan,
} from "@/lib/slip-gaji";
import { tanggalLokal } from "@/lib/waktu";
import { NavigasiSlip } from "../navigasi-slip";
import { FilterRiwayat } from "./filter-riwayat";

export const dynamic = "force-dynamic";

export default async function AdminRiwayatSlipPage({
  searchParams,
}: {
  searchParams: Promise<{
    periode?: string;
    cabang?: string;
    status?: string;
    cari?: string;
  }>;
}) {
  const admin = await wajibAkses("slip-gaji");
  const q = await searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanIni;

  // Sama seperti Daftar: hanya super_admin yang boleh membaca angka gaji.
  const superAdmin = admin.role === "super_admin";
  const cabangId = superAdmin ? (q.cabang ?? "") : "";
  const status: StatusSlipTersimpan | undefined =
    q.status === "dibuat" || q.status === "dibayar" ? q.status : undefined;
  const cari = (q.cari ?? "").trim();

  const riwayat = superAdmin
    ? await ambilRiwayatSlip({
        periode,
        cabangId: cabangId || undefined,
        status,
        cari: cari || undefined,
      })
    : [];
  const cabang = await db.cabang.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });
  // Nama admin pembuat/penanda bayar (ID disimpan di snapshot).
  const namaAdmin = await petaNamaUser(
    riwayat.flatMap((s) => [s.dibuatOleh, s.dibayarOleh]),
  );

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Riwayat Slip Gaji
          </h1>
          <p className="mt-1 text-sm text-muted">
            {`Slip yang sudah diterbitkan periode ${labelPeriode(periode)}. Angka di sini sesuai snapshot yang tersimpan — tidak berubah bila data absensi/gaji diubah sesudahnya.`}
          </p>
        </div>
      </header>

      <NavigasiSlip aktif="riwayat" />

      <div className="mt-6">
        <FilterRiwayat
          periode={periode}
          daftarPeriode={periodeTerakhir(bulanIni, 12)}
          cabangId={cabangId}
          cabang={cabang}
          status={status ?? ""}
          cari={cari}
        />

        {!superAdmin ? (
          <p className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6 text-sm text-muted">
            Hanya super admin dapat melihat slip gaji.
          </p>
        ) : riwayat.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center text-sm text-muted">
            Belum ada slip yang diterbitkan pada filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
            <table className="w-full min-w-[880px] text-sm">
              <caption className="sr-only">Riwayat slip gaji</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="p-3 font-medium">Karyawan</th>
                  <th className="p-3 font-medium">Periode</th>
                  <th className="p-3 text-right font-medium">Diterima</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Dibuat</th>
                  <th className="p-3 font-medium">Dibayar</th>
                  <th className="p-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-line/70 last:border-0"
                  >
                    <th scope="row" className="p-3 text-left">
                      <span className="font-medium">{s.nama}</span>
                      <span className="block text-xs font-normal text-muted">
                        {s.cabangNama ?? "—"}
                      </span>
                    </th>
                    <td className="p-3">{labelPeriode(s.periode)}</td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {formatRupiah(s.diterima)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          s.status === "dibayar"
                            ? "bg-ink text-paper"
                            : "bg-status-hadir/10 text-status-hadir"
                        }`}
                      >
                        {LABEL_STATUS_SLIP[s.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      {tanggalSlip(s.dibuatPada)}
                      <span className="block text-xs text-muted">
                        {s.dibuatOleh
                          ? (namaAdmin.get(s.dibuatOleh) ?? "—")
                          : "—"}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.dibayarPada ? tanggalSlip(s.dibayarPada) : "—"}
                      {s.dibayarOleh ? (
                        <span className="block text-xs text-muted">
                          {namaAdmin.get(s.dibayarOleh) ?? "—"}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <a
                        href={`/admin/payroll/ekspor?periode=${s.periode}&karyawan=${s.userId}`}
                        className="rounded-lg border border-line px-3 py-1.5 text-center text-xs font-medium"
                        title="Unduh slip gaji karyawan ini (PDF)"
                      >
                        Slip PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

import { Pill } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import {
  LABEL_JENIS_IZIN,
  LABEL_STATUS_PENGAJUAN_IZIN,
  bacaJenisIzin,
  bacaStatusPengajuanIzin,
} from "@/lib/izin";
import { wajibLogin } from "@/lib/session";
import { AjukanIzinForm } from "./form";
import { BatalkanIzinButton } from "./batalkan-button";

export const dynamic = "force-dynamic";

export default async function KaryawanIzinPage() {
  const user = await wajibLogin();
  const pengajuan = await db.pengajuanIzin.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Izin</h1>
      <p className="mt-1 text-sm text-muted">
        Ajukan izin atau sakit. Setelah disetujui admin, hari itu ditandai
        izin dan Anda tidak bisa absen masuk.
      </p>

      <AjukanIzinForm />

      <div className="mt-6 space-y-3">
        <p className="text-xs text-muted">Riwayat pengajuan</p>
        {pengajuan.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-sm text-muted">
            Belum ada pengajuan izin.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
            {pengajuan.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {LABEL_JENIS_IZIN[bacaJenisIzin(p.jenis)]} ·{" "}
                    {formatTanggal(p.dari)}
                    {p.sampai !== p.dari ? ` s.d. ${formatTanggal(p.sampai)}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {p.alasan}
                    {p.buktiKeterangan ? ` · Bukti: ${p.buktiKeterangan}` : ""}
                    {p.catatanAdmin ? ` · Catatan admin: ${p.catatanAdmin}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>{formatTanggal(p.createdAt.toISOString().slice(0, 10))}</span>
                  <Pill tone={p.status === "ditolak" ? "redup" : "netral"}>
                    {LABEL_STATUS_PENGAJUAN_IZIN[bacaStatusPengajuanIzin(p.status)]}
                  </Pill>
                  {p.status === "pending" ? (
                    <BatalkanIzinButton id={p.id} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

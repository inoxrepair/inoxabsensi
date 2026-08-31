import { Pill } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { LABEL_KASBON, bacaStatusKasbon } from "@/lib/domain";
import { formatRupiah } from "@/lib/format";
import { formatTanggal } from "@/lib/format";
import { wajibLogin } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { AjukanKasbonForm } from "./form";

export const dynamic = "force-dynamic";

export default async function KaryawanKasbonPage() {
  const user = await wajibLogin();
  const bulanIni = tanggalLokal().slice(0, 7);
  const catatan = await db.kasbon.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const pending = catatan.filter(
    (c) => c.status === "pending" && c.periode === bulanIni,
  );
  const belumBerhasil = pending.length > 0;

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Kasbon</h1>
      <p className="mt-1 text-sm text-muted">
        Ajukan kasbon untuk periode payroll ini. Satu pengajuan pending diperbolehkan per periode.
      </p>

      {belumBerhasil ? (
        <p className="mt-4 rounded-xl border border-status-izin bg-status-izin/5 px-3.5 py-2.5 text-sm text-status-izin">
          Anda memiliki pengajuan pending untuk periode ini.
        </p>
      ) : (
        <AjukanKasbonForm defaultPeriode={bulanIni} />
      )}

      <div className="mt-6 space-y-3">
        <p className="text-xs text-muted">Riwayat pengajuan</p>
        {catatan.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-sm text-muted">
            Belum ada riwayat kasbon.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
            {catatan.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{formatRupiah(c.jumlah)}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {c.periode} · {c.keterangan ?? "Tanpa keterangan"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>{formatTanggal(c.createdAt.toISOString().slice(0, 10))}</span>
                  <Pill tone={c.status === "ditolak" ? "redup" : "netral"}>
                    {LABEL_KASBON[bacaStatusKasbon(c.status)]}
                  </Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

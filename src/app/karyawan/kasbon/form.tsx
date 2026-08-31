"use client";

import { useActionState } from "react";
import {
  ajukanKasbon,
  type HasilKasbon,
} from "@/app/admin/kasbon/actions";

export function AjukanKasbonForm({ defaultPeriode }: { defaultPeriode: string }) {
  const [status, kirim, sedangProses] = useActionState<HasilKasbon | undefined, FormData>(
    ajukanKasbon,
    undefined,
  );

  return (
    <form action={kirim} className="mt-4 rounded-xl border border-line bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">
          Jumlah
          <input name="jumlah" type="number" min={1} inputMode="numeric" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums" />
        </label>
        <label className="text-xs text-muted">
          Periode
          <input name="periode" type="month" defaultValue={defaultPeriode} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums" />
        </label>
      </div>
      <label className="mt-3 block text-xs text-muted">
        Keterangan (opsional)
        <textarea name="keterangan" rows={2} maxLength={200} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      </label>

      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}

      <button type="submit" disabled={sedangProses} className="mt-4 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40">
        {sedangProses ? "Mengirim…" : "Ajukan kasbon"}
      </button>
    </form>
  );
}

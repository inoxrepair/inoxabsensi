"use client";

import { useActionState } from "react";
import {
  ajukanKasbon,
  type HasilKasbon,
} from "@/app/admin/kasbon/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputTanggal } from "@/components/ui/input-tanggal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AjukanKasbonForm({ defaultPeriode }: { defaultPeriode: string }) {
  const [status, kirim, sedangProses] = useActionState<HasilKasbon | undefined, FormData>(
    ajukanKasbon,
    undefined,
  );

  return (
    <form action={kirim} className="mt-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="text-xs font-normal text-muted">
          Jumlah
          <Input name="jumlah" type="number" min={1} inputMode="numeric" required className="mt-1.5 w-full tabular-nums" />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Periode
          <InputTanggal mode="bulan" name="periode" defaultValue={defaultPeriode} required className="mt-1.5 w-full" />
        </Label>
      </div>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Keterangan (opsional)
        <Textarea name="keterangan" rows={2} maxLength={200} className="mt-1.5 w-full" />
      </Label>

      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}

      <Button type="submit" disabled={sedangProses} size="lg" className="mt-4 w-full rounded-xl">
        {sedangProses ? "Mengirim…" : "Ajukan kasbon"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { ajukanIzin, type HasilIzin } from "@/app/admin/izin/actions";
import { MAKS_HARI_PENGAJUAN } from "@/lib/izin";

export function AjukanIzinForm() {
  const [status, kirim, sedangProses] = useActionState<
    HasilIzin | undefined,
    FormData
  >(ajukanIzin, undefined);

  return (
    <form action={kirim} className="mt-4 rounded-xl border border-line bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">
          Dari
          <input name="dari" type="date" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums" />
        </label>
        <label className="text-xs text-muted">
          Sampai
          <input name="sampai" type="date" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums" />
        </label>
      </div>
      <label className="mt-3 block text-xs text-muted">
        Jenis
        <select name="jenis" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
        </select>
      </label>
      <label className="mt-3 block text-xs text-muted">
        Alasan (wajib)
        <textarea name="alasan" rows={3} maxLength={500} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      <label className="mt-3 block text-xs text-muted">
        Keterangan bukti (opsional, mis. surat dokter dikirim via WA)
        <input name="buktiKeterangan" type="text" maxLength={200} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      <p className="mt-3 text-xs text-muted">
        Satu pengajuan maksimal {MAKS_HARI_PENGAJUAN} hari. Setelah disetujui,
        Anda tidak bisa absen masuk pada hari izin itu. Upload surat dokter
        belum tersedia di tahap ini; cukup tulis keterangannya di atas.
      </p>

      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}

      <button type="submit" disabled={sedangProses} className="mt-4 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40">
        {sedangProses ? "Mengirim…" : "Ajukan izin"}
      </button>
    </form>
  );
}

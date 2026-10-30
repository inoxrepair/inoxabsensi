"use client";

import { useActionState } from "react";
import { buatIzinAdmin, type HasilIzin } from "./actions";

export function BuatIzinAdminForm({
  karyawan,
}: {
  karyawan: { id: string; name: string; cabang: string }[];
}) {
  const [status, kirim, sedangProses] = useActionState<
    HasilIzin | undefined,
    FormData
  >(buatIzinAdmin, undefined);

  return (
    <form action={kirim} className="rounded-xl border border-line bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted">
          Karyawan
          <select name="userId" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Pilih karyawan…</option>
            {karyawan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} · {k.cabang}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Tanggal
          <input name="tanggal" type="date" required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums" />
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
        <textarea name="alasan" rows={2} maxLength={500} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      <p className="mt-3 text-xs text-muted">
        Hanya untuk tanggal yang ada jadwal shift. Hari tanpa jadwal tidak
        dibuat izin, dan hari yang sudah hadir/telat tidak ditimpa.
      </p>
      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}
      <button type="submit" disabled={sedangProses} className="mt-4 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40">
        {sedangProses ? "Menyimpan…" : "Buat izin"}
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { generateJadwalBulanan, importJadwalCsv, type Hasil } from "./actions";

export function AlatJadwal({
  awal,
  akhir,
  polaMulai,
  cabangId,
  onPesan,
}: {
  awal: string;
  akhir: string;
  polaMulai: string;
  cabangId: string;
  onPesan: (h: Hasil) => void;
}) {
  const [bulan, setBulan] = useState(awal.slice(0, 7));
  const [pending, mulai] = useTransition();
  const exportUrl = `/admin/jadwal/export?dari=${awal}&sampai=${akhir}${cabangId ? `&cabang=${cabangId}` : ""}`;

  function importCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("cabangId", cabangId);
    mulai(async () => onPesan(await importJadwalCsv(fd)));
  }

  function generate() {
    const fd = new FormData();
    fd.set("bulan", bulan);
    fd.set("polaMulai", polaMulai);
    fd.set("cabangId", cabangId);
    mulai(async () => onPesan(await generateJadwalBulanan(fd)));
  }

  return (
    <section className="mt-6 grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Export Excel/CSV</p>
        <p className="mt-1 text-xs text-muted">Unduh overview yang sedang tampil. File dapat dibuka di Excel.</p>
        <a href={exportUrl} className="mt-3 block rounded-lg border border-line px-3 py-2 text-center text-sm font-medium">Unduh CSV</a>
      </div>

      <form onSubmit={importCsv} className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Import dari Excel/CSV</p>
        <p className="mt-1 text-xs text-muted">Gunakan file hasil export, lalu ubah kode P/S/F/L di Excel.</p>
        <input name="file" type="file" accept=".csv,text/csv" required className="mt-3 block w-full text-sm" />
        <button type="submit" disabled={pending} className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:opacity-40">Import CSV</button>
      </form>

      <div className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Buat jadwal otomatis bulanan</p>
        <p className="mt-1 text-xs text-muted">Mengulang pola 7 hari mulai {polaMulai} ke seluruh bulan. Hasil tetap bisa diedit.</p>
        <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <button type="button" onClick={generate} disabled={pending} className="mt-3 w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-40">Generate bulan</button>
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { importBackupJadwal, type HasilBackup } from "./backup-actions";

export function BackupJadwalPanel({ defaultDari, defaultSampai }: { defaultDari: string; defaultSampai: string }) {
  const [dari, setDari] = useState(defaultDari);
  const [sampai, setSampai] = useState(defaultSampai);
  const [hasil, setHasil] = useState<HasilBackup | null>(null);
  const [pending, mulai] = useTransition();
  const url = `/admin/pengaturan/backup-jadwal/export?dari=${dari}&sampai=${sampai}`;

  function importFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mulai(async () => setHasil(await importBackupJadwal(data)));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Download backup jadwal</p>
        <p className="mt-1 text-xs text-muted">File disimpan di perangkat, bukan database. Pilih rentang yang ingin diamankan.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">Dari<input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" /></label>
          <label className="text-xs text-muted">Sampai<input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" /></label>
        </div>
        <a href={url} className="mt-4 block rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper">Download Backup JSON</a>
      </section>

      <form onSubmit={importFile} className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Import / restore backup</p>
        <p className="mt-1 text-xs text-muted">Restore mengganti jadwal akun/tanggal yang terdapat dalam file. Maksimal 10 MB.</p>
        <input name="file" type="file" accept=".json,application/json" required className="mt-3 block w-full text-sm" />
        <button type="submit" disabled={pending} className="mt-4 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40">{pending ? "Memulihkan…" : "Import Backup"}</button>
        {hasil ? <p role="status" className={`mt-3 text-sm ${hasil.ok ? "text-status-hadir" : "text-status-alpa"}`}>{hasil.pesan}</p> : null}
      </form>
    </div>
  );
}

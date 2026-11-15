"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  importBackupJadwal,
  previewRestoreBackup,
  type HasilBackup,
} from "./backup-actions";
import {
  DialogKonfirmasiMassal,
  type RingkasanMassal,
} from "@/app/admin/jadwal/konfirmasi-massal";
import { InputTanggal } from "@/components/ui/input-tanggal";

export function BackupJadwalPanel({ defaultDari, defaultSampai }: { defaultDari: string; defaultSampai: string }) {
  const [dari, setDari] = useState(defaultDari);
  const [sampai, setSampai] = useState(defaultSampai);
  const [hasil, setHasil] = useState<HasilBackup | null>(null);
  const [pending, mulai] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState<{
    ringkasan: RingkasanMassal;
    file: File;
  } | null>(null);
  const url = `/admin/pengaturan/backup-jadwal/export?dari=${dari}&sampai=${sampai}`;

  function importFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const file = data.get("file");
    mulai(async () => {
      const preview = await previewRestoreBackup(data);
      if (!preview.ok) {
        setHasil({ ok: false, pesan: preview.pesan });
        return;
      }
      setKonfirmasi({
        ringkasan: {
          judul: "Restore backup jadwal?",
          karyawan: preview.karyawan,
          dari: preview.dari,
          sampai: preview.sampai,
          jumlahHari: preview.jumlahHari,
          barisDihapus: preview.barisDihapus,
          barisDibuat: preview.barisDibuat,
          catatan:
            "Hanya kombinasi karyawan/tanggal yang ada di file yang diganti; tanggal lain tidak tersentuh.",
        },
        file: file instanceof File ? file : new File([], "backup.json"),
      });
    });
  }

  function jalankanKonfirmasi() {
    if (!konfirmasi) return;
    const file = konfirmasi.file;
    setKonfirmasi(null);
    mulai(async () => {
      const data = new FormData();
      data.set("file", file);
      setHasil(await importBackupJadwal(data));
    });
  }

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
        <p className="text-sm font-semibold">Download backup jadwal</p>
        <p className="mt-1 text-xs text-muted">File disimpan di perangkat, bukan database. Pilih rentang yang ingin diamankan.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Label className="text-xs font-normal text-muted">Dari<InputTanggal value={dari} onChange={setDari} className="mt-1 w-full" /></Label>
          <Label className="text-xs font-normal text-muted">Sampai<InputTanggal value={sampai} onChange={setSampai} className="mt-1 w-full" /></Label>
        </div>
        <a href={url} className="mt-4 block rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper">Download Backup JSON</a>
      </section>

      <form onSubmit={importFile} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
        <p className="text-sm font-semibold">Import / restore backup</p>
        <p className="mt-1 text-xs text-muted">Restore mengganti jadwal akun/tanggal yang terdapat dalam file. Maksimal 10 MB.</p>
        <input name="file" type="file" accept=".json,application/json" required className="mt-3 block w-full text-sm" />
        <Button type="submit" variant="outline" size="lg" disabled={pending} className="mt-4 w-full">{pending ? "Memeriksa…" : "Lihat dampak & import backup"}</Button>
        {hasil ? <p role="status" className={`mt-3 text-sm ${hasil.ok ? "text-status-hadir" : "text-status-alpa"}`}>{hasil.pesan}</p> : null}
      </form>
    </div>
    {konfirmasi ? (
      <DialogKonfirmasiMassal
        ringkasan={konfirmasi.ringkasan}
        sedang={pending}
        onBatal={() => setKonfirmasi(null)}
        onKonfirmasi={jalankanKonfirmasi}
      />
    ) : null}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { hapusAbsensi, simpanEditAbsensi } from "./actions";
import type { BarisLog } from "./filter";

export function AksiBaris({ row, canDelete }: { row: BarisLog; canDelete: boolean }) {
  const [edit, setEdit] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, mulai] = useTransition();

  if (edit) return <EditBaris row={row} onSelesai={(h) => { setPesan(h); setEdit(false); }} onBatal={() => setEdit(false)} />;

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => setEdit(true)} className="rounded-lg border border-line px-2.5 py-1 text-xs">Ubah</button>
      {canDelete ? (
        <button type="button" disabled={pending} onClick={() => { if (confirm("Hapus catatan ini? Pengguna dapat absen lagi.")) { mulai(async () => setPesan((await hapusAbsensi(row.id)).pesan)); } }} className="rounded-lg border border-line px-2.5 py-1 text-xs text-status-alpa disabled:opacity-40">
          Hapus
        </button>
      ) : null}
      {pesan ? <p className="text-xs">{pesan}</p> : null}
    </div>
  );
}

function EditBaris({ row, onSelesai, onBatal }: { row: BarisLog; onSelesai: (pesan: string) => void; onBatal: () => void }) {
  const [pending, mulai] = useTransition();

  function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mulai(async () => {
      const hasil = await simpanEditAbsensi(form);
      onSelesai(hasil.pesan);
    });
  }

  return (
    <form onSubmit={kirim} className="rounded-lg border border-line p-2 space-y-2 text-xs">
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="tanggal" value={row.tanggal} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-muted">Masuk</span>
          <input type="time" name="masuk" defaultValue={row.masuk !== null ? menitToTime(row.masuk) : ""} className="mt-0.5 w-full rounded border px-2 py-1" />
        </label>
        <label className="block">
          <span className="text-muted">Keluar</span>
          <input type="time" name="keluar" defaultValue={row.keluar !== null ? menitToTime(row.keluar) : ""} className="mt-0.5 w-full rounded border px-2 py-1" />
        </label>
      </div>
      <label className="block">
        <span className="text-muted">Status</span>
        <select name="status" defaultValue={row.status} className="mt-0.5 w-full rounded border px-2 py-1">
          <option value="hadir">Hadir</option>
          <option value="telat">Telat</option>
          <option value="izin">Izin</option>
          <option value="alpa">Alpa</option>
          <option value="libur">Libur</option>
        </select>
      </label>
      <label className="block">
        <span className="text-muted">Catatan</span>
        <input name="catatan" defaultValue={row.catatan ?? ""} className="mt-0.5 w-full rounded border px-2 py-1" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-ink px-2 py-1 text-paper disabled:opacity-40">Simpan</button>
        <button type="button" onClick={onBatal} className="rounded border px-2 py-1">Batal</button>
      </div>
    </form>
  );
}

function menitToTime(m: number) {
  const j = String(Math.floor(m / 60)).padStart(2, "0");
  const menit = String(m % 60).padStart(2, "0");
  return `${j}:${menit}`;
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hapusAbsensi, simpanEditAbsensi } from "./actions";
import type { BarisLog } from "./filter";

export function AksiBaris({ row, canDelete }: { row: BarisLog; canDelete: boolean }) {
  const [edit, setEdit] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, mulai] = useTransition();

  if (edit) return <EditBaris row={row} onSelesai={(h) => { setPesan(h); setEdit(false); }} onBatal={() => setEdit(false)} />;

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={() => setEdit(true)}>Ubah</Button>
      {canDelete ? (
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => { if (confirm("Hapus catatan ini? Pengguna dapat absen lagi.")) { mulai(async () => setPesan((await hapusAbsensi(row.id)).pesan)); } }} className="text-status-alpa">
          Hapus
        </Button>
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
      {row.cycles.length > 1 ? (
        <>
          <input type="hidden" name="masuk" value={row.masuk !== null ? menitToTime(row.masuk) : ""} />
          <input type="hidden" name="keluar" value={row.keluar !== null ? menitToTime(row.keluar) : ""} />
        </>
      ) : null}
      {row.cycles.length > 1 ? <p className="rounded bg-surface p-2 text-muted">Catatan memiliki {row.cycles.length} cycle. Jam per cycle dipertahankan; form ini hanya mengubah status dan catatan.</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Label className="block text-xs font-normal">
          <span className="text-muted">Masuk</span>
          <Input type="time" name="masuk" disabled={row.cycles.length > 1} defaultValue={row.masuk !== null ? menitToTime(row.masuk) : ""} className="mt-0.5 h-auto px-2 py-1 text-xs disabled:bg-surface" />
        </Label>
        <Label className="block text-xs font-normal">
          <span className="text-muted">Keluar</span>
          <Input type="time" name="keluar" disabled={row.cycles.length > 1} defaultValue={row.keluar !== null ? menitToTime(row.keluar) : ""} className="mt-0.5 h-auto px-2 py-1 text-xs disabled:bg-surface" />
        </Label>
      </div>
      <Label className="block text-xs font-normal">
        <span className="text-muted">Status</span>
        <Select name="status" defaultValue={row.status}>
          <SelectTrigger className="mt-0.5 h-auto px-2 py-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hadir">Hadir</SelectItem>
            <SelectItem value="telat">Telat</SelectItem>
            <SelectItem value="izin">Izin</SelectItem>
            <SelectItem value="alpa">Alpa</SelectItem>
            <SelectItem value="libur">Libur</SelectItem>
          </SelectContent>
        </Select>
      </Label>
      <Label className="block text-xs font-normal">
        <span className="text-muted">Catatan</span>
        <Input name="catatan" defaultValue={row.catatan ?? ""} className="mt-0.5 h-auto px-2 py-1 text-xs" />
      </Label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} className="h-auto px-2 py-1 text-xs">Simpan</Button>
        <Button type="button" variant="outline" size="sm" onClick={onBatal} className="h-auto px-2 py-1 text-xs">Batal</Button>
      </div>
    </form>
  );
}

function menitToTime(m: number) {
  const j = String(Math.floor(m / 60)).padStart(2, "0");
  const menit = String(m % 60).padStart(2, "0");
  return `${j}:${menit}`;
}

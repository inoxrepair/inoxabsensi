"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hapusSeragam, simpanSeragam, ubahStatusSeragam, type HasilSeragam } from "./seragam-actions";

export type BarisSeragam = { id: string; kode: string; nama: string; deskripsi: string | null; aktif: boolean; dipakai: number };

export function DaftarSeragam({ rows }: { rows: BarisSeragam[] }) {
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [pesan, setPesan] = useState<HasilSeragam | null>(null);
  return (
    <div className="space-y-3">
      {pesan ? <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm ${pesan.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>{pesan.pesan}</p> : null}
      {dibuka === "baru" ? <FormSeragam onSelesai={(h) => { setDibuka(null); setPesan(h); }} onBatal={() => setDibuka(null)} /> : <Button type="button" variant="glass" onClick={() => { setPesan(null); setDibuka("baru"); }} className="h-auto w-full rounded-xl border-dashed px-4 py-3">+ Tambah jenis seragam</Button>}
      {rows.map((r) => dibuka === r.id ? <FormSeragam key={r.id} awal={r} onSelesai={(h) => { setDibuka(null); setPesan(h); }} onBatal={() => setDibuka(null)} /> : <Kartu key={r.id} row={r} onUbah={() => setDibuka(r.id)} onPesan={setPesan} />)}
    </div>
  );
}

function Kartu({ row: r, onUbah, onPesan }: { row: BarisSeragam; onUbah: () => void; onPesan: (h: HasilSeragam) => void }) {
  const [pending, mulai] = useTransition();
  return <article className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{r.nama} {!r.aktif ? <span className="ml-1 text-xs text-muted">nonaktif</span> : null}</p><p className="text-xs text-muted">{r.kode} · {r.dipakai} jadwal · {r.deskripsi ?? "Tanpa deskripsi"}</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={onUbah}>Ubah</Button><Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => mulai(async () => onPesan(await ubahStatusSeragam(r.id, !r.aktif)))} className="text-muted">{r.aktif ? "Nonaktifkan" : "Aktifkan"}</Button><Button type="button" variant="outline" size="sm" disabled={pending || r.dipakai > 0} onClick={() => mulai(async () => onPesan(await hapusSeragam(r.id)))} className="text-status-alpa">Hapus</Button></div></div></article>;
}

function FormSeragam({ awal, onSelesai, onBatal }: { awal?: BarisSeragam; onSelesai: (h: HasilSeragam) => void; onBatal: () => void }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [pending, mulai] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form action={(fd) => { setGalat(null); mulai(async () => { const h = await simpanSeragam(awal?.id ?? null, fd); if (h.ok) onSelesai(h); else setGalat(h.pesan); }); }} className="rounded-2xl border border-ink bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <p className="text-sm font-semibold">{awal ? `Ubah ${awal.nama}` : "Jenis seragam baru"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Label className="text-xs font-normal text-muted">Kode<input ref={ref} name="kode" defaultValue={awal?.kode} required className="mt-1.5 w-full rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-3 py-2 text-sm uppercase" /></Label>
        <Label className="text-xs font-normal text-muted">Nama<Input name="nama" defaultValue={awal?.nama} required className="mt-1.5" /></Label>
      </div>
      <Label className="mt-3 block text-xs font-normal text-muted">Deskripsi<Textarea name="deskripsi" defaultValue={awal?.deskripsi ?? ""} rows={2} className="mt-1.5 min-h-0" /></Label>
      <Label htmlFor="aktif" className="mt-3 flex items-center gap-2 text-sm font-normal"><Checkbox id="aktif" name="aktif" defaultChecked={awal?.aktif ?? true} />Aktif</Label>
      {galat ? <p role="alert" className="mt-3 text-sm text-status-alpa">{galat}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
        <Button type="button" variant="outline" onClick={onBatal}>Batal</Button>
      </div>
    </form>
  );
}

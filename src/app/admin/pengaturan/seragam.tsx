"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { hapusSeragam, simpanSeragam, ubahStatusSeragam, type HasilSeragam } from "./seragam-actions";

export type BarisSeragam = { id: string; kode: string; nama: string; deskripsi: string | null; aktif: boolean; dipakai: number };
const INPUT = "mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";

export function DaftarSeragam({ rows }: { rows: BarisSeragam[] }) {
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [pesan, setPesan] = useState<HasilSeragam | null>(null);
  return (
    <div className="space-y-3">
      {pesan ? <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm ${pesan.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>{pesan.pesan}</p> : null}
      {dibuka === "baru" ? <FormSeragam onSelesai={(h) => { setDibuka(null); setPesan(h); }} onBatal={() => setDibuka(null)} /> : <button type="button" onClick={() => { setPesan(null); setDibuka("baru"); }} className="w-full rounded-xl border border-dashed border-line bg-paper px-4 py-3 text-sm font-medium">+ Tambah jenis seragam</button>}
      {rows.map((r) => dibuka === r.id ? <FormSeragam key={r.id} awal={r} onSelesai={(h) => { setDibuka(null); setPesan(h); }} onBatal={() => setDibuka(null)} /> : <Kartu key={r.id} row={r} onUbah={() => setDibuka(r.id)} onPesan={setPesan} />)}
    </div>
  );
}

function Kartu({ row: r, onUbah, onPesan }: { row: BarisSeragam; onUbah: () => void; onPesan: (h: HasilSeragam) => void }) {
  const [pending, mulai] = useTransition();
  return <article className="rounded-xl border border-line bg-paper p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{r.nama} {!r.aktif ? <span className="ml-1 text-xs text-muted">nonaktif</span> : null}</p><p className="text-xs text-muted">{r.kode} · {r.dipakai} jadwal · {r.deskripsi ?? "Tanpa deskripsi"}</p></div><div className="flex gap-2"><button type="button" onClick={onUbah} className="rounded-lg border border-line px-3 py-1.5 text-sm">Ubah</button><button type="button" disabled={pending} onClick={() => mulai(async () => onPesan(await ubahStatusSeragam(r.id, !r.aktif)))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted disabled:opacity-40">{r.aktif ? "Nonaktifkan" : "Aktifkan"}</button><button type="button" disabled={pending || r.dipakai > 0} onClick={() => mulai(async () => onPesan(await hapusSeragam(r.id)))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-status-alpa disabled:opacity-40">Hapus</button></div></div></article>;
}

function FormSeragam({ awal, onSelesai, onBatal }: { awal?: BarisSeragam; onSelesai: (h: HasilSeragam) => void; onBatal: () => void }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [pending, mulai] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <form action={(fd) => { setGalat(null); mulai(async () => { const h = await simpanSeragam(awal?.id ?? null, fd); if (h.ok) onSelesai(h); else setGalat(h.pesan); }); }} className="rounded-xl border border-ink bg-paper p-4"><p className="text-sm font-semibold">{awal ? `Ubah ${awal.nama}` : "Jenis seragam baru"}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted">Kode<input ref={ref} name="kode" defaultValue={awal?.kode} required className={`${INPUT} uppercase`} /></label><label className="text-xs text-muted">Nama<input name="nama" defaultValue={awal?.nama} required className={INPUT} /></label></div><label className="mt-3 block text-xs text-muted">Deskripsi<textarea name="deskripsi" defaultValue={awal?.deskripsi ?? ""} rows={2} className={INPUT} /></label><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={awal?.aktif ?? true} className="size-4 accent-ink" />Aktif</label>{galat ? <p role="alert" className="mt-3 text-sm text-status-alpa">{galat}</p> : null}<div className="mt-4 flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">{pending ? "Menyimpan…" : "Simpan"}</button><button type="button" onClick={onBatal} className="rounded-lg border border-line px-4 py-2 text-sm">Batal</button></div></form>;
}

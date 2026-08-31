"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StatusAbsensi } from "@/lib/domain";

export type BarisLog = {
  id: string;
  nama: string;
  cabang: string;
  tanggal: string;
  masuk: number | null;
  keluar: number | null;
  status: StatusAbsensi;
  menitKerja: number | null;
  menitTelat: number;
  catatan: string | null;
};

export function FilterLog({
  awal,
  akhir,
  cabang,
  cabangTerpilih,
  role,
}: {
  awal: string;
  akhir: string;
  cabang: { id: string; nama: string }[];
  cabangTerpilih: string;
  role: string;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(awal);
  const [sampai, setSampai] = useState(akhir);

  function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new URLSearchParams({ dari, sampai });
    if (cabangTerpilih) q.set("cabang", cabangTerpilih);
    router.push(`/admin/log-absensi?${q}` as Route);
  }

  function pilihCabang(id: string) {
    const q = new URLSearchParams({ dari, sampai });
    if (id) q.set("cabang", id);
    router.push(`/admin/log-absensi?${q}` as Route);
  }

  return (
    <form onSubmit={terapkan} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-3">
      <label className="text-xs text-muted">
        Dari
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} required className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      <label className="text-xs text-muted">
        Sampai
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} required className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      {role === "super_admin" ? (
        <label className="text-xs text-muted">
          Cabang
          <select value={cabangTerpilih} onChange={(e) => pilihCabang(e.target.value)} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Semua</option>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper">Tampilkan</button>
    </form>
  );
}

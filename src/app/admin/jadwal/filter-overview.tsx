"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InputTanggal } from "@/components/ui/input-tanggal";

/** Mengubah rentang kolom tabel saja; tidak menulis data jadwal. */
export function FilterOverview({
  awal,
  akhir,
  cabangId,
}: {
  awal: string;
  akhir: string;
  cabangId: string;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(awal);
  const [sampai, setSampai] = useState(akhir);
  const [galat, setGalat] = useState<string | null>(null);

  function tampilkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat(null);
    if (!dari || !sampai) {
      setGalat("Tanggal dari dan sampai wajib diisi.");
      return;
    }

    const q = new URLSearchParams({ dari, sampai });
    if (cabangId) q.set("cabang", cabangId);
    router.push(`/admin/jadwal?${q}` as Route);
  }

  return (
    <form
      onSubmit={tampilkan}
      className="mb-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium">Overview rentang tanggal</p>
          <p className="text-xs text-muted">
            Hanya mengubah tanggal pada tabel, tidak menerapkan shift.
          </p>
        </div>
        <label className="text-xs text-muted">
          Dari
          <InputTanggal value={dari} onChange={setDari} required className="mt-1 block" />
        </label>
        <label className="text-xs text-muted">
          Sampai
          <InputTanggal value={sampai} onChange={setSampai} required className="mt-1 block" />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
        >
          Lihat overview
        </button>
      </div>
      {galat ? (
        <p role="alert" className="mt-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}
    </form>
  );
}

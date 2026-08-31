"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      className="mb-4 rounded-xl border border-line bg-paper p-3"
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
          <input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            required
            className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="text-xs text-muted">
          Sampai
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            required
            className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm tabular-nums"
          />
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

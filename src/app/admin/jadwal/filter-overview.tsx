"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
        <Label className="text-xs font-normal text-muted">
          Dari
          <InputTanggal value={dari} onChange={setDari} required className="mt-1 block" />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Sampai
          <InputTanggal value={sampai} onChange={setSampai} required className="mt-1 block" />
        </Label>
        <Button type="submit">
          Lihat overview
        </Button>
      </div>
      {galat ? (
        <p role="alert" className="mt-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}
    </form>
  );
}

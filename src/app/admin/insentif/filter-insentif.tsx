"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rentangPeriodeGajian } from "@/lib/rekap";

/**
 * Filter Insentif — pola yang sama dengan filter Log Absensi: pilih
 * Periode (bulan penggajian) dan rentang tanggal Dari/Sampai, lalu
 * Tampilkan. Ganti Periode mengembalikan Dari/Sampai ke siklus gajian
 * default bulan itu (28 bulan sebelumnya s.d. 27 bulan periode);
 * tanggalnya bisa diubah bebas sebelum sinkron.
 */
export function FilterInsentif({
  periode,
  dari,
  sampai,
}: {
  periode: string;
  dari: string;
  sampai: string;
}) {
  const router = useRouter();
  const [bulan, setBulan] = useState(periode);
  const [dariState, setDari] = useState(dari);
  const [sampaiState, setSampai] = useState(sampai);

  function gantiBulan(nilai: string) {
    setBulan(nilai);
    const r = rentangPeriodeGajian(nilai);
    setDari(r.dari);
    setSampai(r.sampai);
  }

  function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new URLSearchParams({
      periode: bulan,
      dari: dariState,
      sampai: sampaiState,
    });
    router.push(`/admin/insentif?${q}` as Route);
  }

  return (
    <form
      onSubmit={terapkan}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-3"
    >
      <label className="text-xs text-muted">
        Periode
        <input
          type="month"
          value={bulan}
          onChange={(e) => gantiBulan(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs text-muted">
        Dari
        <input
          type="date"
          value={dariState}
          onChange={(e) => setDari(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs text-muted">
        Sampai
        <input
          type="date"
          value={sampaiState}
          onChange={(e) => setSampai(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
      >
        Tampilkan
      </button>
    </form>
  );
}

"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rentangPeriodeGajian } from "@/lib/rekap";
import { InputTanggal } from "@/components/ui/input-tanggal";

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

  // Sinkronkan kembali dari server setelah navigasi: halaman menjepit
  // rentang ke siklus gajian bulan itu, jadi nilai yang tampil harus
  // mengikuti hasil jepitan (bukan yang diketik sebelum Tampilkan).
  useEffect(() => {
    setBulan(periode);
    setDari(dari);
    setSampai(sampai);
  }, [periode, dari, sampai]);

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
      className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
    >
      <label className="text-xs text-muted">
        Periode
        <InputTanggal mode="bulan" value={bulan} onChange={gantiBulan} required className="mt-1 block" />
      </label>
      <label className="text-xs text-muted">
        Dari
        <InputTanggal value={dariState} onChange={setDari} required className="mt-1 block" />
      </label>
      <label className="text-xs text-muted">
        Sampai
        <InputTanggal value={sampaiState} onChange={setSampai} required className="mt-1 block" />
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

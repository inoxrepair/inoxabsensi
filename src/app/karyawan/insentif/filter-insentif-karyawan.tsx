"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputTanggal } from "@/components/ui/input-tanggal";
import { Label } from "@/components/ui/label";
import { rentangPeriodeGajian } from "@/lib/rekap";

/**
 * Filter Insentif karyawan — pola yang sama dengan filter Insentif admin:
 * pilih Periode (bulan penggajian) dan rentang tanggal Dari/Sampai, lalu
 * Terapkan. Ganti Periode mengembalikan Dari/Sampai ke siklus gajian
 * default bulan itu (28 bulan sebelumnya s.d. 27 bulan periode).
 * Tombol Reset rentang hanya muncul bila rentang kustom sedang aktif.
 */
export function FilterInsentifKaryawan({
  periode,
  dari,
  sampai,
  kustom,
}: {
  periode: string;
  dari: string;
  sampai: string;
  kustom: boolean;
}) {
  const router = useRouter();
  const [bulan, setBulan] = useState(periode);
  const [dariState, setDari] = useState(dari);
  const [sampaiState, setSampai] = useState(sampai);

  // Sinkronkan kembali dari server setelah navigasi: halaman menjepit
  // rentang ke siklus gajian bulan itu, jadi nilai yang tampil harus
  // mengikuti hasil jepitan (bukan yang diketik sebelum Terapkan).
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
    router.push(`/karyawan/insentif?${q}` as Route);
  }

  function resetRentang() {
    router.push(`/karyawan/insentif?periode=${bulan}` as Route);
  }

  return (
    <form
      onSubmit={terapkan}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
    >
      <Label className="text-xs font-normal text-muted">
        Periode
        <InputTanggal mode="bulan" value={bulan} onChange={gantiBulan} required className="mt-1 block" />
      </Label>
      <Label className="text-xs font-normal text-muted">
        Dari
        <InputTanggal value={dariState} onChange={setDari} required className="mt-1 block" />
      </Label>
      <Label className="text-xs font-normal text-muted">
        Sampai
        <InputTanggal value={sampaiState} onChange={setSampai} required className="mt-1 block" />
      </Label>
      <Button type="submit">
        Terapkan
      </Button>
      {kustom ? (
        <Button
          type="button"
          variant="outline"
          onClick={resetRentang}
        >
          Reset rentang
        </Button>
      ) : null}
    </form>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { labelPeriode } from "@/lib/rekap";
import { InputTanggal } from "@/components/ui/input-tanggal";

/**
 * Filter payroll: periode bulanan (tetap jadi periode gajian dan tempat
 * simpan) + rentang tanggal opsional yang membatasi hitungan hadir/telat
 * (tunjangan makan & potongan telat) di dalam bulan itu. Rentang yang
 * melewati batas periode gajian dijepit server (lihat bacaRentangGajian).
 */
export function FilterPayroll({
  periode,
  daftarPeriode,
  cabangId,
  cabang,
  jendela,
  batas,
}: {
  periode: string;
  daftarPeriode: string[];
  cabangId: string;
  cabang: { id: string; nama: string }[];
  /** Jendela hitung aktif (periode penuh bila tidak kustom). */
  jendela: { dari: string; sampai: string; kustom: boolean };
  /** Batas periode gajian — rentang tanggal dijepit ke dalamnya. */
  batas: { dari: string; sampai: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [dari, setDari] = useState(jendela.kustom ? jendela.dari : "");
  const [sampai, setSampai] = useState(jendela.kustom ? jendela.sampai : "");

  // Navigasi browser atau perubahan periode dari server harus menyegarkan
  // state input lokal; tanpa ini tanggal bulan sebelumnya bisa tertinggal.
  useEffect(() => {
    setDari(jendela.kustom ? jendela.dari : "");
    setSampai(jendela.kustom ? jendela.sampai : "");
  }, [jendela.dari, jendela.sampai, jendela.kustom]);

  function navigasi(ubah: (q: URLSearchParams) => void) {
    const q = new URLSearchParams(params);
    ubah(q);
    router.push(`/admin/payroll?${q}`);
  }

  function ubah(kunci: string, nilai: string) {
    navigasi((q) => {
      if (nilai) q.set(kunci, nilai);
      else q.delete(kunci);
    });
  }

  function terapkanRentang() {
    if (!dari || !sampai) return;
    navigasi((q) => {
      q.set("dari", dari);
      q.set("sampai", sampai);
    });
  }

  function resetRentang() {
    navigasi((q) => {
      q.delete("dari");
      q.delete("sampai");
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
      <span className="inline-flex items-center gap-2">
        <label htmlFor="periode-payroll" className="text-xs text-muted">
          Periode
        </label>
        <select
          id="periode-payroll"
          value={periode}
          onChange={(e) => ubah("periode", e.target.value)}
          className="rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-2.5 py-1.5 text-sm"
        >
          {daftarPeriode.map((p) => (
            <option key={p} value={p}>
              {labelPeriode(p)}
            </option>
          ))}
        </select>
      </span>

      {cabang.length > 1 ? (
        <span className="inline-flex items-center gap-2">
          <label htmlFor="cabang-payroll" className="text-xs text-muted">
            Cabang
          </label>
          <select
            id="cabang-payroll"
            value={cabangId}
            onChange={(e) => ubah("cabang", e.target.value)}
            className="rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-2.5 py-1.5 text-sm"
          >
            <option value="">Semua cabang</option>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </span>
      ) : null}

      <span className="inline-flex flex-wrap items-center gap-2">
        <label htmlFor="dari-payroll" className="text-xs text-muted">
          Dari
        </label>
        <InputTanggal
          id="dari-payroll"
          value={dari}
          min={batas.dari}
          max={sampai || batas.sampai}
          onChange={setDari}
          varian="kaca"
          padat
          className="w-36"
        />
        <label htmlFor="sampai-payroll" className="text-xs text-muted">
          Sampai
        </label>
        <InputTanggal
          id="sampai-payroll"
          value={sampai}
          min={dari || batas.dari}
          max={batas.sampai}
          onChange={setSampai}
          varian="kaca"
          padat
          className="w-36"
        />
        <button
          type="button"
          onClick={terapkanRentang}
          disabled={!dari || !sampai}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          Terapkan
        </button>
        {jendela.kustom ? (
          <button
            type="button"
            onClick={resetRentang}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
          >
            Reset rentang
          </button>
        ) : null}
      </span>
    </div>
  );
}

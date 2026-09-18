"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { labelPeriode } from "@/lib/rekap";

/**
 * Filter rekap: pilih periode bulanan atau rentang tanggal kustom.
 * Nilai disimpan di query string supaya hasilnya bisa dibagikan lewat URL
 * dan tombol back browser tetap bekerja.
 */
export function FilterRekap({
  periode,
  daftarPeriode,
  cabangId,
  daftarCabang,
  rentang,
  urlExport,
  labelExport = "Unduh",
}: {
  periode: string;
  daftarPeriode: string[];
  cabangId: string;
  daftarCabang: { id: string; nama: string }[];
  rentang: { dari: string; sampai: string; kustom: boolean };
  urlExport: string;
  labelExport?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"bulan" | "kustom">(
    rentang.kustom ? "kustom" : "bulan",
  );
  const [dari, setDari] = useState(rentang.dari);
  const [sampai, setSampai] = useState(rentang.sampai);

  // Navigasi browser atau perubahan periode dari server harus menyegarkan
  // state input lokal; tanpa ini tanggal bulan sebelumnya bisa tertinggal.
  useEffect(() => {
    setDari(rentang.dari);
    setSampai(rentang.sampai);
    setMode(rentang.kustom ? "kustom" : "bulan");
  }, [rentang.dari, rentang.sampai, rentang.kustom]);

  function navigasi(ubah: (q: URLSearchParams) => void) {
    const q = new URLSearchParams(params);
    ubah(q);
    router.push(`/admin/rekap?${q}`);
  }

  function pilihBulan(nilai: string) {
    navigasi((q) => {
      q.set("periode", nilai);
      q.delete("dari");
      q.delete("sampai");
    });
  }

  function terapkanKustom() {
    if (!dari || !sampai) return;
    navigasi((q) => {
      q.set("dari", dari);
      q.set("sampai", sampai);
      q.delete("periode");
    });
  }

  function keBulan() {
    setMode("bulan");
    navigasi((q) => {
      q.delete("dari");
      q.delete("sampai");
    });
  }

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-lg border border-line p-0.5">
          <button
            type="button"
            onClick={keBulan}
            aria-pressed={mode === "bulan"}
            className={`rounded-md px-3 py-1 text-sm ${
              mode === "bulan" ? "bg-ink font-medium text-paper" : "text-muted"
            }`}
          >
            Per bulan
          </button>
          <button
            type="button"
            onClick={() => setMode("kustom")}
            aria-pressed={mode === "kustom"}
            className={`rounded-md px-3 py-1 text-sm ${
              mode === "kustom" ? "bg-ink font-medium text-paper" : "text-muted"
            }`}
          >
            Rentang tanggal
          </button>
        </span>

        {mode === "bulan" ? (
          <span className="inline-flex items-center gap-2">
            <label htmlFor="periode" className="text-xs text-muted">
              Periode
            </label>
            <select
              id="periode"
              value={periode}
              onChange={(e) => pilihBulan(e.target.value)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
            >
              {daftarPeriode.map((p) => (
                <option key={p} value={p}>
                  {labelPeriode(p)}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            <label htmlFor="dari" className="text-xs text-muted">
              Dari
            </label>
            <input
              id="dari"
              type="date"
              value={dari}
              max={sampai || undefined}
              onChange={(e) => setDari(e.target.value)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm tabular-nums"
            />
            <label htmlFor="sampai" className="text-xs text-muted">
              Sampai
            </label>
            <input
              id="sampai"
              type="date"
              value={sampai}
              min={dari || undefined}
              onChange={(e) => setSampai(e.target.value)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={terapkanKustom}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
            >
              Terapkan
            </button>
          </span>
        )}

        {daftarCabang.length > 1 ? (
          <span className="inline-flex items-center gap-2">
            <label htmlFor="cabang" className="text-xs text-muted">
              Cabang
            </label>
            <select
              id="cabang"
              value={cabangId}
              onChange={(e) =>
                navigasi((q) => {
                  if (e.target.value) q.set("cabang", e.target.value);
                  else q.delete("cabang");
                })
              }
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
            >
              <option value="">Semua cabang</option>
              {daftarCabang.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </span>
        ) : null}

        <a
          href={urlExport}
          className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
        >
          {labelExport}
        </a>
      </div>
    </div>
  );
}

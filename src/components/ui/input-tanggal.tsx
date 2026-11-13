"use client";

import { useId, useState } from "react";
import { formatTanggal } from "@/lib/format";
import { labelPeriode } from "@/lib/rekap";

/**
 * Kolom pilih tanggal/bulan yang SAMA di semua menu.
 *
 * Masalah yang diperbaiki (ditemukan 13 Nov 2026 dari screenshot iPhone):
 * - `<input type="date">` bawaan ditampilkan iOS Safari sebagai
 *   "13 Nov 2026" (format locale perangkat), melanggar aturan tampilan
 *   aplikasi yang mewajibkan dd/mm/yyyy.
 * - Lebar minimum bawaan input date di WebKit membuat kolomnya meluber
 *   keluar kartu di layar HP (grid tidak bisa mengecil di bawah
 *   min-content input).
 *
 * Cara kerja: yang terlihat adalah kolom biasa berisi tanggal yang sudah
 * diformat (dd/mm/yyyy, atau "November 2026" untuk bulan). Di atasnya
 * menempel input date/month bawaan yang transparan — ketukan membukanya
 * langsung ke pemilih tanggal native (roda tanggal iOS), jadi pengalaman
 * memilih tetap native, hanya tampilannya yang selalu konsisten.
 * Nilai yang dikirim ke form tetap ISO (yyyy-mm-dd / yyyy-mm), jadi
 * server action dan filter yang sudah ada tidak berubah.
 */
type InputTanggalProps = {
  /** "tanggal" -> dd/mm/yyyy, "bulan" -> "November 2026". Default "tanggal". */
  mode?: "tanggal" | "bulan";
  name?: string;
  id?: string;
  /** Nilai ISO terkontrol. Bila diisi, komponen terkontrol. */
  value?: string;
  /** Nilai awal ISO untuk mode tidak terkontrol (form server action). */
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  /** "biasa": border-line transparan (sama seperti input lain di form).
   *  "kaca": panel kaca (untuk filter rekap & form karyawan). */
  varian?: "biasa" | "kaca";
  /** Bila true, padding lebih padat (px-2.5 py-1.5) untuk baris filter. */
  padat?: boolean;
  /** Kelas pembungkus (ukuran). Default w-full. */
  className?: string;
};

function tampilkan(mode: "tanggal" | "bulan", iso: string): string {
  if (!iso) return "";
  return mode === "bulan" ? labelPeriode(iso) : formatTanggal(iso);
}

export function InputTanggal({
  mode = "tanggal",
  name,
  id,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  min,
  max,
  placeholder,
  varian = "biasa",
  padat = false,
  className,
}: InputTanggalProps) {
  const idOtomatis = useId();
  const idInput = id ?? `tanggal-${idOtomatis.replace(/[^a-zA-Z0-9]/g, "")}`;
  const terkontrol = value !== undefined;
  const [nilaiLokal, setNilaiLokal] = useState(defaultValue ?? "");
  const nilai = terkontrol ? (value ?? "") : nilaiLokal;
  const teks =
    tampilkan(mode, nilai) ||
    placeholder ||
    (mode === "bulan" ? "Pilih bulan" : "Pilih tanggal");

  function ubah(iso: string) {
    if (!terkontrol) setNilaiLokal(iso);
    onChange?.(iso);
  }

  const kelasKolom =
    varian === "kaca"
      ? "border border-white/60 bg-white/60 shadow-md shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50"
      : "border border-line";

  return (
    <div className={`relative min-w-0 ${className ?? "w-full"}`}>
      <div
        aria-hidden="true"
        className={`flex w-full min-w-0 items-center gap-2 rounded-lg text-sm focus-within:outline-2 focus-within:outline-ink focus-within:outline-offset-2 ${
          padat ? "px-2.5 py-1.5" : "px-3 py-2"
        } ${kelasKolom} ${disabled ? "opacity-40" : ""}`}
      >
        <span
          className={`min-w-0 flex-1 truncate tabular-nums ${
            nilai ? "text-ink" : "text-muted"
          }`}
        >
          {teks}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0 text-muted"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </div>
      <input
        type={mode === "bulan" ? "month" : "date"}
        id={idInput}
        name={name}
        value={terkontrol ? value : undefined}
        defaultValue={terkontrol ? undefined : defaultValue}
        // onInput ikut dipasang: iOS Safari kadang tidak memicu onChange
        // pada type="date" di dalam form (lihat form-rentang.tsx).
        onChange={(e) => ubah(e.target.value)}
        onInput={(e) => ubah((e.target as HTMLInputElement).value)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        aria-label={
          placeholder ?? (mode === "bulan" ? "Pilih bulan" : "Pilih tanggal")
        }
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}

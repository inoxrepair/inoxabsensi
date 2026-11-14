"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InformasiItem } from "@/lib/informasi";

/**
 * Popup informasi setelah absen masuk. Pesan tampil satu per satu,
 * terbaru dulu; tiap pesan punya tombol CTA sesuai aksi yang diatur
 * admin (tutup popup / buka tautan / buka halaman aplikasi). Tema kaca
 * sama dengan dialog konfirmasi absen di halaman ini.
 *
 * Mode pratinjau (dipakai admin di menu Informasi): popup yang sama
 * persis seperti yang dilihat karyawan, tapi tombol CTA "halaman" tidak
 * memindahkan admin ke halaman karyawan — cukup menutup popup.
 */
export function PopupInformasi({
  daftar,
  onTutup,
  pratinjau = false,
}: {
  daftar: InformasiItem[];
  onTutup: () => void;
  pratinjau?: boolean;
}) {
  const router = useRouter();
  const [indeks, setIndeks] = useState(0);
  const pesan = daftar[indeks];
  if (!pesan) return null;

  const terakhir = indeks === daftar.length - 1;

  function lanjut() {
    if (terakhir) onTutup();
    else setIndeks(indeks + 1);
  }

  function klikCta() {
    if (pesan.ctaAksi === "tautan" && pesan.ctaTautan) {
      window.open(pesan.ctaTautan, "_blank", "noopener");
      lanjut();
    } else if (pesan.ctaAksi === "halaman" && pesan.ctaHalaman) {
      // Pratinjau: jangan pindahkan admin keluar dari menu Informasi.
      if (pratinjau) {
        lanjut();
        return;
      }
      onTutup();
      router.push(pesan.ctaHalaman);
    } else {
      lanjut();
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-informasi-judul"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/60 p-5 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50">
        <div className="flex items-start justify-between gap-3">
          <h2 id="popup-informasi-judul" className="font-semibold">
            {pesan.judul}
          </h2>
          <button
            type="button"
            onClick={lanjut}
            aria-label="Tutup informasi"
            className="shrink-0 rounded-full px-2 text-lg leading-none text-muted"
          >
            ×
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
          {pesan.isi}
        </p>
        <button
          type="button"
          onClick={klikCta}
          className="mt-4 w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-paper"
        >
          {pesan.ctaLabel}
        </button>
        {daftar.length > 1 ? (
          <p className="mt-2 text-center text-xs text-muted">
            Pesan {indeks + 1} dari {daftar.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}

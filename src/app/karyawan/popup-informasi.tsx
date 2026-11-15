"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog
      open
      onOpenChange={(buka) => {
        if (!buka) lanjut();
      }}
    >
      <DialogContent className="max-w-sm p-5">
        <DialogHeader>
          <DialogTitle>{pesan.judul}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">
            {pesan.isi}
          </DialogDescription>
        </DialogHeader>
        <Button size="lg" type="button" onClick={klikCta} className="w-full">
          {pesan.ctaLabel}
        </Button>
        {daftar.length > 1 ? (
          <p className="text-center text-xs text-muted">
            Pesan {indeks + 1} dari {daftar.length}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import type { InformasiItem } from "@/lib/informasi";
import { PopupInformasi } from "@/app/karyawan/popup-informasi";

/**
 * Tombol Pratinjau di tiap kartu pesan: membuka popup yang sama persis
 * seperti yang dilihat karyawan setelah absen masuk (judul, isi, tombol
 * CTA), supaya admin bisa memeriksa tampilannya sebelum pesan tayang.
 * Mode pratinjau: tombol CTA "halaman" tidak memindahkan admin ke
 * halaman karyawan, cukup menutup popup.
 */
export function PratinjauInformasi({ pesan }: { pesan: InformasiItem }) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
      >
        Pratinjau
      </button>
      {buka ? (
        <PopupInformasi
          daftar={[pesan]}
          pratinjau
          onTutup={() => setBuka(false)}
        />
      ) : null}
    </>
  );
}

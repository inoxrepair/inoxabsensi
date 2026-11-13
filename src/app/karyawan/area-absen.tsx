"use client";

import { useState } from "react";
import type { InformasiItem } from "@/lib/informasi";
import { DURASI_ANIMASI_MS } from "@/lib/suara";
import { TombolAbsen } from "./tombol-absen";
import { PopupInformasi } from "./popup-informasi";

/**
 * Area tombol absen + popup informasi. Popup dibuka setelah absen masuk
 * berhasil — ditunda sejenak supaya animasi centang selesai dulu — dan
 * hanya bila ada pesan yang tampil hari ini.
 */
export function AreaAbsen({
  mode,
  cycleKe,
  maksimalCycle,
  mulaiMenit,
  daftar,
}: {
  mode: "masuk" | "keluar" | "selesai";
  cycleKe: number;
  maksimalCycle: number;
  mulaiMenit: number | null;
  daftar: InformasiItem[];
}) {
  const [popupBuka, setPopupBuka] = useState(false);

  return (
    <>
      <TombolAbsen
        mode={mode}
        cycleKe={cycleKe}
        maksimalCycle={maksimalCycle}
        mulaiMenit={mulaiMenit}
        onMasukBerhasil={() => {
          if (daftar.length === 0) return;
          window.setTimeout(() => setPopupBuka(true), DURASI_ANIMASI_MS);
        }}
      />
      {popupBuka ? (
        <PopupInformasi daftar={daftar} onTutup={() => setPopupBuka(false)} />
      ) : null}
    </>
  );
}

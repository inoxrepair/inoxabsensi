"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  KotakKosong,
  TampilanPeringkat,
  type ItemPeringkat,
} from "./tampilan-peringkat";

type HasilPerbaikan = {
  peringkat: {
    userId: string;
    nama: string;
    foto: string | null;
    cabang: string | null;
    skor: number;
  }[];
};

/**
 * Isi tab "Perbaikan" — dimuat hanya saat tab dibuka (Radix tidak me-mount
 * konten tab yang belum aktif), bukan saat halaman Top 10 pertama dibuka.
 * Sekali dimuat dalam masa hidup halaman, tidak fetch ulang saat pindah
 * tab bolak-balik (cache modul di bawah).
 */
let cacheItems: ItemPeringkat[] | null = null;

type Keadaan =
  | { status: "memuat" }
  | { status: "ok"; items: ItemPeringkat[] }
  | { status: "gagal" };

export function TabPerbaikan() {
  const [percobaan, setPercobaan] = useState(0);
  const [keadaan, setKeadaan] = useState<Keadaan>(() =>
    cacheItems
      ? { status: "ok", items: cacheItems }
      : { status: "memuat" },
  );

  useEffect(() => {
    if (cacheItems) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/top5/perbaikan", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HasilPerbaikan;
        const items: ItemPeringkat[] = data.peringkat.map((p) => ({
          userId: p.userId,
          nama: p.nama,
          foto: p.foto,
          cabang: p.cabang,
          skor: p.skor,
          subPodium: p.cabang ?? "Tanpa cabang",
          subBaris: p.cabang ?? "Tanpa cabang",
        }));
        cacheItems = items;
        if (!batal) setKeadaan({ status: "ok", items });
      } catch {
        if (!batal) setKeadaan({ status: "gagal" });
      }
    })();
    return () => {
      batal = true;
    };
  }, [percobaan]);

  if (keadaan.status === "memuat") {
    return (
      <p className="mt-4 text-center text-sm text-muted">
        Memuat peringkat perbaikan…
      </p>
    );
  }

  if (keadaan.status === "gagal") {
    return (
      <div className="mt-4 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center">
        <p className="text-sm font-medium">Peringkat perbaikan gagal dimuat.</p>
        <p className="mt-1 text-sm text-muted">
          Periksa koneksi, lalu coba lagi.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            setKeadaan({ status: "memuat" });
            setPercobaan((n) => n + 1);
          }}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (keadaan.items.length === 0) {
    return (
      <KotakKosong
        judul="Belum ada perbaikan"
        isi="Perbaikan tercatat setelah sinkron insentif berjalan pada periode ini."
      />
    );
  }

  return (
    <>
      <TampilanPeringkat items={keadaan.items} />
      <p className="mt-4 text-xs text-muted">
        1 perbaikan = 1 poin. Dihitung per item/baris transaksi (satu nota
        dengan 2 perbaikan = 2 poin).
      </p>
    </>
  );
}

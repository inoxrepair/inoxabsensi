"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { labelPeriode } from "@/lib/rekap";
import { InputTanggal } from "@/components/ui/input-tanggal";

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
    <div className="mb-4 space-y-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            if (v === "bulan") keBulan();
            else setMode("kustom");
          }}
        >
          <TabsList className="gap-0 border-line bg-transparent p-0.5 shadow-none">
            <TabsTrigger value="bulan" className="py-1">
              Per bulan
            </TabsTrigger>
            <TabsTrigger value="kustom" className="py-1">
              Rentang tanggal
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "bulan" ? (
          <span className="inline-flex items-center gap-2">
            <Label htmlFor="periode" className="text-xs font-normal text-muted">
              Periode
            </Label>
            <Select value={periode} onValueChange={pilihBulan}>
              <SelectTrigger
                id="periode"
                className="h-auto w-auto px-2.5 py-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daftarPeriode.map((p) => (
                  <SelectItem key={p} value={p}>
                    {labelPeriode(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            <Label htmlFor="dari" className="text-xs font-normal text-muted">
              Dari
            </Label>
            <InputTanggal id="dari" value={dari} max={sampai || undefined} onChange={setDari} varian="kaca" padat />
            <Label htmlFor="sampai" className="text-xs font-normal text-muted">
              Sampai
            </Label>
            <InputTanggal id="sampai" value={sampai} min={dari || undefined} onChange={setSampai} varian="kaca" padat />
            <Button
              type="button"
              size="sm"
              onClick={terapkanKustom}
              className="px-3 text-sm"
            >
              Terapkan
            </Button>
          </span>
        )}

        {daftarCabang.length > 1 ? (
          <span className="inline-flex items-center gap-2">
            <Label htmlFor="cabang" className="text-xs font-normal text-muted">
              Cabang
            </Label>
            <Select
              value={cabangId || "semua"}
              onValueChange={(v) =>
                navigasi((q) => {
                  if (v !== "semua") q.set("cabang", v);
                  else q.delete("cabang");
                })
              }
            >
              <SelectTrigger
                id="cabang"
                className="h-auto w-auto px-2.5 py-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua cabang</SelectItem>
                {daftarCabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

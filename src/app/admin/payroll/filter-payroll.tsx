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
        <Label htmlFor="periode-payroll" className="text-xs font-normal text-muted">
          Periode
        </Label>
        <Select value={periode} onValueChange={(v) => ubah("periode", v)}>
          <SelectTrigger
            id="periode-payroll"
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

      {cabang.length > 1 ? (
        <span className="inline-flex items-center gap-2">
          <Label htmlFor="cabang-payroll" className="text-xs font-normal text-muted">
            Cabang
          </Label>
          <Select
            value={cabangId || "semua"}
            onValueChange={(v) => ubah("cabang", v === "semua" ? "" : v)}
          >
            <SelectTrigger
              id="cabang-payroll"
              className="h-auto w-auto px-2.5 py-1.5"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua cabang</SelectItem>
              {cabang.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      ) : null}

      <span className="inline-flex flex-wrap items-center gap-2">
        <Label htmlFor="dari-payroll" className="text-xs font-normal text-muted">
          Dari
        </Label>
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
        <Label htmlFor="sampai-payroll" className="text-xs font-normal text-muted">
          Sampai
        </Label>
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
        <Button
          type="button"
          size="sm"
          onClick={terapkanRentang}
          disabled={!dari || !sampai}
          className="px-3 text-sm"
        >
          Terapkan
        </Button>
        {jendela.kustom ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetRentang}
          >
            Reset rentang
          </Button>
        ) : null}
      </span>
    </div>
  );
}

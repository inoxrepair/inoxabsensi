"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { labelPeriode } from "@/lib/rekap";

/** Filter Riwayat Slip: periode + cabang + status + cari nama. */
export function FilterRiwayat({
  periode,
  daftarPeriode,
  cabangId,
  cabang,
  status,
  cari,
}: {
  periode: string;
  daftarPeriode: string[];
  cabangId: string;
  cabang: { id: string; nama: string }[];
  /** "" = semua status. */
  status: string;
  cari: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [teksCari, setTeksCari] = useState(cari);

  function navigasi(ubah: (q: URLSearchParams) => void) {
    const q = new URLSearchParams(params);
    ubah(q);
    router.push(`/admin/slip-gaji/riwayat?${q}`);
  }

  function ubah(kunci: string, nilai: string) {
    navigasi((q) => {
      if (nilai) q.set(kunci, nilai);
      else q.delete(kunci);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
      <span className="inline-flex items-center gap-2">
        <Label htmlFor="periode-riwayat" className="text-xs font-normal text-muted">
          Periode
        </Label>
        <Select value={periode} onValueChange={(v) => ubah("periode", v)}>
          <SelectTrigger
            id="periode-riwayat"
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
          <Label htmlFor="cabang-riwayat" className="text-xs font-normal text-muted">
            Cabang
          </Label>
          <Select
            value={cabangId || "semua"}
            onValueChange={(v) => ubah("cabang", v === "semua" ? "" : v)}
          >
            <SelectTrigger
              id="cabang-riwayat"
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

      <span className="inline-flex items-center gap-2">
        <Label htmlFor="status-riwayat" className="text-xs font-normal text-muted">
          Status
        </Label>
        <Select
          value={status || "semua"}
          onValueChange={(v) => ubah("status", v === "semua" ? "" : v)}
        >
          <SelectTrigger
            id="status-riwayat"
            className="h-auto w-auto px-2.5 py-1.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="dibuat">Sudah dibuat</SelectItem>
            <SelectItem value="dibayar">Sudah dibayar</SelectItem>
          </SelectContent>
        </Select>
      </span>

      <span className="inline-flex items-center gap-2">
        <Label htmlFor="cari-riwayat" className="text-xs font-normal text-muted">
          Cari nama
        </Label>
        <Input
          id="cari-riwayat"
          value={teksCari}
          onChange={(e) => setTeksCari(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ubah("cari", teksCari.trim());
          }}
          placeholder="Nama karyawan"
          className="h-auto w-44 px-2.5 py-1.5"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => ubah("cari", teksCari.trim())}
          className="px-3 text-sm"
        >
          Cari
        </Button>
        {cari ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTeksCari("");
              ubah("cari", "");
            }}
          >
            Reset
          </Button>
        ) : null}
      </span>
    </div>
  );
}

"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatusAbsensi } from "@/lib/domain";
import type { StatusWajah } from "@/lib/wajah";
import { InputTanggal } from "@/components/ui/input-tanggal";

export type BarisLog = {
  id: string;
  nama: string;
  cabang: string;
  tanggal: string;
  masuk: number | null;
  keluar: number | null;
  status: StatusAbsensi;
  menitKerja: number | null;
  menitTelat: number;
  /** Isi catatan manual (kolom Absensi.catatan), null bila belum pernah diedit. */
  catatan: string | null;
  /** True bila baris pernah diedit manual (kolom Absensi.editedBy terisi). */
  diedit: boolean;
  faceStatus: StatusWajah | null;
  faceJarak: number | null;
  cycles: { urutan: number; masukMenit: number; keluarMenit: number | null }[];
};

export function FilterLog({
  awal,
  akhir,
  cabang,
  cabangTerpilih,
  role,
}: {
  awal: string;
  akhir: string;
  cabang: { id: string; nama: string }[];
  cabangTerpilih: string;
  role: string;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(awal);
  const [sampai, setSampai] = useState(akhir);

  function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new URLSearchParams({ dari, sampai });
    if (cabangTerpilih) q.set("cabang", cabangTerpilih);
    router.push(`/admin/log-absensi?${q}` as Route);
  }

  function pilihCabang(id: string) {
    const q = new URLSearchParams({ dari, sampai });
    if (id) q.set("cabang", id);
    router.push(`/admin/log-absensi?${q}` as Route);
  }

  return (
    <form onSubmit={terapkan} className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
      <Label className="text-xs font-normal text-muted">
        Dari
        <InputTanggal value={dari} onChange={setDari} required className="mt-1 block" />
      </Label>
      <Label className="text-xs font-normal text-muted">
        Sampai
        <InputTanggal value={sampai} onChange={setSampai} required className="mt-1 block" />
      </Label>
      {role === "super_admin" ? (
        <Label className="text-xs font-normal text-muted">
          Cabang
          <Select
            value={cabangTerpilih || "semua"}
            onValueChange={(v) => pilihCabang(v === "semua" ? "" : v)}
          >
            <SelectTrigger className="mt-1 block">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              {cabang.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
      ) : null}
      <Button type="submit">Tampilkan</Button>
      <a
        href={`/admin/log-absensi/arsip?${new URLSearchParams({
          dari,
          sampai,
          ...(cabangTerpilih ? { cabang: cabangTerpilih } : {}),
        }).toString()}`}
        className="ml-auto rounded-lg border border-line px-4 py-2 text-sm font-medium"
        title="Unduh arsip absensi (ZIP berisi PDF per bulan per karyawan)"
      >
        Download Arsip
      </a>
    </form>
  );
}

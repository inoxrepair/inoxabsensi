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
import { InputTanggal } from "@/components/ui/input-tanggal";

export function FilterLogLogin({
  awal,
  akhir,
  cabang,
  cabangTerpilih,
  karyawan,
  karyawanTerpilih,
  jenisTerpilih,
}: {
  awal: string;
  akhir: string;
  cabang: { id: string; nama: string }[];
  cabangTerpilih: string;
  karyawan: { id: string; name: string; cabangId: string | null }[];
  karyawanTerpilih: string;
  jenisTerpilih: string;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(awal);
  const [sampai, setSampai] = useState(akhir);

  function dorong(nilai: {
    dari?: string;
    sampai?: string;
    cabang?: string;
    karyawan?: string;
    jenis?: string;
  }) {
    const q = new URLSearchParams({
      dari: nilai.dari ?? dari,
      sampai: nilai.sampai ?? sampai,
    });
    const cabangBaru = nilai.cabang ?? cabangTerpilih;
    const karyawanBaru = nilai.karyawan ?? karyawanTerpilih;
    const jenisBaru = nilai.jenis ?? jenisTerpilih;
    if (cabangBaru) q.set("cabang", cabangBaru);
    if (karyawanBaru) q.set("karyawan", karyawanBaru);
    if (jenisBaru) q.set("jenis", jenisBaru);
    router.push(`/admin/log-login?${q}` as Route);
  }

  function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    dorong({});
  }

  // Daftar karyawan mengikuti filter cabang (bila cabang dipilih).
  const karyawanTampil = karyawan.filter(
    (k) => !cabangTerpilih || k.cabangId === cabangTerpilih,
  );

  return (
    <form
      onSubmit={terapkan}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
    >
      <Label className="text-xs font-normal text-muted">
        Dari
        <InputTanggal
          value={dari}
          onChange={setDari}
          required
          className="mt-1 block"
        />
      </Label>
      <Label className="text-xs font-normal text-muted">
        Sampai
        <InputTanggal
          value={sampai}
          onChange={setSampai}
          required
          className="mt-1 block"
        />
      </Label>
      <Label className="text-xs font-normal text-muted">
        Cabang
        <Select
          value={cabangTerpilih || "semua"}
          onValueChange={(v) => dorong({ cabang: v === "semua" ? "" : v, karyawan: "" })}
        >
          <SelectTrigger className="mt-1 block">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            {cabang.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      <Label className="text-xs font-normal text-muted">
        Karyawan
        <Select
          value={karyawanTerpilih || "semua"}
          onValueChange={(v) => dorong({ karyawan: v === "semua" ? "" : v })}
        >
          <SelectTrigger className="mt-1 block">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            {karyawanTampil.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      <Label className="text-xs font-normal text-muted">
        Jenis
        <Select
          value={jenisTerpilih || "semua"}
          onValueChange={(v) => dorong({ jenis: v === "semua" ? "" : v })}
        >
          <SelectTrigger className="mt-1 block">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            <SelectItem value="masuk">Masuk</SelectItem>
            <SelectItem value="keluar">Keluar</SelectItem>
          </SelectContent>
        </Select>
      </Label>
      <Button type="submit">
        Tampilkan
      </Button>
    </form>
  );
}

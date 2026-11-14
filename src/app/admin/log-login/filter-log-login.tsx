"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
      <label className="text-xs text-muted">
        Dari
        <InputTanggal
          value={dari}
          onChange={setDari}
          required
          className="mt-1 block"
        />
      </label>
      <label className="text-xs text-muted">
        Sampai
        <InputTanggal
          value={sampai}
          onChange={setSampai}
          required
          className="mt-1 block"
        />
      </label>
      <label className="text-xs text-muted">
        Cabang
        <select
          value={cabangTerpilih}
          onChange={(e) => dorong({ cabang: e.target.value, karyawan: "" })}
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">Semua</option>
          {cabang.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Karyawan
        <select
          value={karyawanTerpilih}
          onChange={(e) => dorong({ karyawan: e.target.value })}
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">Semua</option>
          {karyawanTampil.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Jenis
        <select
          value={jenisTerpilih}
          onChange={(e) => dorong({ jenis: e.target.value })}
          className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">Semua</option>
          <option value="masuk">Masuk</option>
          <option value="keluar">Keluar</option>
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper"
      >
        Tampilkan
      </button>
    </form>
  );
}

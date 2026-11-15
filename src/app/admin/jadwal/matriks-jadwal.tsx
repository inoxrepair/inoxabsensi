"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { namaHari } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";
import { setJadwal, type Hasil } from "./actions";

export type Shift = {
  id: string;
  nama: string;
  mulai: string;
  selesai: string;
};

export type SeragamOption = {
  id: string;
  nama: string;
  aktif: boolean;
};

export type BarisJadwal = {
  userId: string;
  nama: string;
  cabang: string;
  /** 7 entri Senin..Minggu; null = libur. */
  hari: ({ shiftId: string; seragamId: string | null; seragam: string | null } | null)[];
};

/**
 * Matriks jadwal: satu Select per sel. Perubahan langsung dikirim ke
 * server action, jadi tidak ada tombol simpan global yang bisa terlupa.
 * Nilai "Off"/"Tanpa seragam" memakai sentinel "off"/"tanpa" karena
 * Radix Select tidak mengizinkan SelectItem dengan value "".
 */
export function MatriksJadwal({
  minggu,
  baris,
  shift,
  seragam,
  onPesan,
  onCellChange,
}: {
  minggu: string[];
  baris: BarisJadwal[];
  shift: Shift[];
  seragam: SeragamOption[];
  onPesan: (h: Hasil) => void;
  onCellChange?: (userId: string, tanggal: string, shiftId: string, seragamId: string) => void;
}) {
  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center text-sm text-muted">
        Belum ada karyawan aktif untuk dijadwalkan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Matriks jadwal shift mingguan per karyawan
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="p-3 font-medium">
              Karyawan
            </th>
            {minggu.map((tgl) => (
              <th key={tgl} scope="col" className="p-3 font-medium">
                {namaHari(tgl, true)}
                <span className="ml-1 font-normal normal-case tabular-nums">
                  {formatTanggal(tgl)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((r) => (
            <tr key={r.userId} className="border-b border-line/70 last:border-0">
              <th scope="row" className="p-3 text-left">
                <span className="font-medium">{r.nama}</span>
                <span className="block text-xs font-normal text-muted">
                  {r.cabang}
                </span>
              </th>
              {minggu.map((tgl, i) => (
                <td key={tgl} className="p-2">
                  <SelShift
                    key={`${r.userId}:${tgl}:${r.hari[i]?.shiftId ?? "off"}:${r.hari[i]?.seragamId ?? "none"}`}
                    userId={r.userId}
                    nama={r.nama}
                    tanggal={tgl}
                    hari={namaHari(tgl, true)}
                    nilai={r.hari[i]?.shiftId ?? ""}
                    seragam={r.hari[i]?.seragam ?? ""}
                    seragamId={r.hari[i]?.seragamId ?? ""}
                    shift={shift}
                    pilihanSeragam={seragam}
                    onPesan={onPesan}
                    onCellChange={onCellChange}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelShift({
  userId,
  nama,
  tanggal,
  hari,
  nilai,
  seragam,
  seragamId,
  shift,
  pilihanSeragam,
  onPesan,
  onCellChange,
}: {
  userId: string;
  nama: string;
  tanggal: string;
  hari: string;
  nilai: string;
  seragam: string;
  seragamId: string;
  shift: Shift[];
  pilihanSeragam: SeragamOption[];
  onPesan: (h: Hasil) => void;
  onCellChange?: (userId: string, tanggal: string, shiftId: string, seragamId: string) => void;
}) {
  // Optimistis: tampilkan pilihan baru langsung, tanpa menunggu server.
  const [pilihan, setPilihan] = useState(nilai);
  const [pilihanSeragamId, setPilihanSeragamId] = useState(seragamId);
  const [menunggu, mulai] = useTransition();

  // Sel dapat tetap mounted ketika server mengirim data baru untuk tanggal
  // yang sama (import, generator, salin minggu, massal). Tanpa sinkronisasi
  // ini dropdown menyimpan state lama sementara preview sudah data baru.
  useEffect(() => {
    setPilihan(nilai);
  }, [nilai, userId, tanggal]);

  useEffect(() => {
    setPilihanSeragamId(seragamId);
  }, [seragamId, userId, tanggal]);

  function ubah(shiftId: string) {
    const sebelumnya = pilihan;
    setPilihan(shiftId);

    const data = new FormData();
    data.set("userId", userId);
    data.set("tanggal", tanggal);
    data.set("shiftId", shiftId);
    if (pilihanSeragamId) data.set("seragamId", pilihanSeragamId);

    mulai(async () => {
      const hasil = await setJadwal(data);
      if (!hasil.ok) setPilihan(sebelumnya);
      else onCellChange?.(userId, tanggal, shiftId, shiftId ? pilihanSeragamId : "");
      onPesan(hasil);
    });
  }

  function ubahSeragam(id: string) {
    const sebelumnya = pilihanSeragamId;
    setPilihanSeragamId(id);
    const data = new FormData();
    data.set("userId", userId);
    data.set("tanggal", tanggal);
    data.set("shiftId", pilihan);
    data.set("seragamId", id);
    mulai(async () => {
      const hasil = await setJadwal(data);
      if (!hasil.ok) setPilihanSeragamId(sebelumnya);
      else onCellChange?.(userId, tanggal, pilihan, id);
      onPesan(hasil);
    });
  }

  return (
    <div className="space-y-1.5">
      <Select
        value={pilihan || "off"}
        disabled={menunggu}
        onValueChange={(v) => ubah(v === "off" ? "" : v)}
      >
        <SelectTrigger
          aria-label={`Shift ${nama} hari ${hari} tanggal ${tanggal}`}
          className={`h-auto px-2 py-1.5 ${
            pilihan
              ? "border-line bg-surface font-medium"
              : "border-status-alpa/30 bg-status-alpa/10 text-status-alpa"
          }`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="off">Off</SelectItem>
          {shift.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pilihan ? (
        <Select
          value={pilihanSeragamId || "tanpa"}
          disabled={menunggu}
          onValueChange={(v) => ubahSeragam(v === "tanpa" ? "" : v)}
        >
          <SelectTrigger
            aria-label={`Seragam ${nama} hari ${hari} tanggal ${tanggal}`}
            className="h-auto border-white/60 bg-white/60 px-2 py-1.5 text-xs text-muted shadow-md shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tanpa">Tanpa seragam</SelectItem>
            {pilihanSeragam.map((s) => (
              <SelectItem key={s.id} value={s.id} disabled={!s.aktif && s.id !== pilihanSeragamId}>
                {s.nama}{!s.aktif ? " (nonaktif)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

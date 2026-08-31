"use client";

import { useState, useTransition } from "react";
import { namaHari } from "@/lib/waktu";
import { setJadwal, type Hasil } from "./actions";

export type Shift = {
  id: string;
  nama: string;
  mulai: string;
  selesai: string;
};

export type BarisJadwal = {
  userId: string;
  nama: string;
  cabang: string;
  /** 7 entri Senin..Minggu; null = libur. */
  hari: ({ shiftId: string; seragam: string | null } | null)[];
};

/**
 * Matriks jadwal: satu <select> per sel. Perubahan langsung dikirim ke
 * server action, jadi tidak ada tombol simpan global yang bisa terlupa.
 */
export function MatriksJadwal({
  minggu,
  baris,
  shift,
  onPesan,
}: {
  minggu: string[];
  baris: BarisJadwal[];
  shift: Shift[];
  onPesan: (h: Hasil) => void;
}) {
  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper p-8 text-center text-sm text-muted">
        Belum ada karyawan aktif untuk dijadwalkan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-paper">
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
                  {tgl.slice(8)}
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
                    userId={r.userId}
                    nama={r.nama}
                    tanggal={tgl}
                    hari={namaHari(tgl, true)}
                    nilai={r.hari[i]?.shiftId ?? ""}
                    seragam={r.hari[i]?.seragam ?? ""}
                    shift={shift}
                    onPesan={onPesan}
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
  shift,
  onPesan,
}: {
  userId: string;
  nama: string;
  tanggal: string;
  hari: string;
  nilai: string;
  seragam: string;
  shift: Shift[];
  onPesan: (h: Hasil) => void;
}) {
  // Optimistis: tampilkan pilihan baru langsung, tanpa menunggu server.
  const [pilihan, setPilihan] = useState(nilai);
  const [menunggu, mulai] = useTransition();

  function ubah(shiftId: string) {
    const sebelumnya = pilihan;
    setPilihan(shiftId);

    const data = new FormData();
    data.set("userId", userId);
    data.set("tanggal", tanggal);
    data.set("shiftId", shiftId);
    if (seragam) data.set("seragam", seragam);

    mulai(async () => {
      const hasil = await setJadwal(data);
      if (!hasil.ok) setPilihan(sebelumnya);
      onPesan(hasil);
    });
  }

  return (
    <select
      aria-label={`Shift ${nama} hari ${hari} tanggal ${tanggal}`}
      value={pilihan}
      disabled={menunggu}
      onChange={(e) => ubah(e.target.value)}
      className={`w-full rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50 ${
        pilihan
          ? "border-line bg-surface font-medium"
          : "border-line/60 bg-paper text-muted"
      }`}
    >
      <option value="">Libur</option>
      {shift.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nama} ({s.mulai}–{s.selesai})
        </option>
      ))}
    </select>
  );
}

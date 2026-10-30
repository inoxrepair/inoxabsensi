"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import { melebihiPendapatan, takeHomePay } from "@/lib/payroll";
import { simpanPayroll, type HasilPayroll } from "./actions";

export type BarisPayroll = {
  userId: string;
  nama: string;
  cabang: string;
  gajiPokok: number;
  tunjangan: number;
  potonganTelat: number;
  kasbon: number;
  /** Acuan saja, tidak otomatis jadi potongan (tidak ada tarif di sistem). */
  menitTelatRekap: number;
  /** Sisa kasbon disetujui periode ini (jumlah - terbayar). */
  kasbonDisetujuiSisa: number;
};

const KOMPONEN = [
  ["gajiPokok", "Gaji pokok"],
  ["tunjangan", "Tunjangan"],
  ["potonganTelat", "Potongan"],
  ["kasbon", "Kasbon"],
] as const;

/** Form payroll per karyawan; semua angka tersimpan sekaligus per baris. */
export function TabelPayroll({
  periode,
  baris,
}: {
  periode: string;
  baris: BarisPayroll[];
}) {
  const [pesan, setPesan] = useState<HasilPayroll | null>(null);

  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-paper p-8 text-center text-sm text-muted">
        Belum ada karyawan aktif pada lingkup ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pesan ? (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            pesan.ok
              ? "bg-status-hadir/10 text-status-hadir"
              : "bg-status-alpa/10 text-status-alpa"
          }`}
        >
          {pesan.pesan}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[980px] text-sm">
          <caption className="sr-only">Payroll editable per karyawan</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3 font-medium">Karyawan</th>
              {KOMPONEN.map(([, label]) => (
                <th key={label} className="p-3 text-right font-medium">
                  {label}
                </th>
              ))}
              <th className="p-3 text-right font-medium">Telat rekap</th>
              <th className="p-3 text-right font-medium">Kasbon disetujui (sisa)</th>
              <th className="p-3 text-right font-medium">Diterima</th>
              <th className="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((r) => (
              // Periode menjadi bagian key agar state input tidak terbawa
              // ketika admin berpindah bulan untuk karyawan yang sama.
              <Baris
                key={`${periode}:${r.userId}`}
                periode={periode}
                awal={r}
                onPesan={setPesan}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Nilai disimpan dalam rupiah. Gaji diterima = gaji pokok + tunjangan -
        potongan - kasbon. Potongan telat tetap diisi manual karena tidak ada
        tarif rupiah per menit telat di sistem; kolom Telat rekap hanya acuan.
        Tombol &quot;Isi kasbon dari pengajuan&quot; hanya mengisi kolom, nilai
        baru tersimpan setelah tombol Simpan ditekan.
      </p>
    </div>
  );
}

function Baris({
  periode,
  awal,
  onPesan,
}: {
  periode: string;
  awal: BarisPayroll;
  onPesan: (h: HasilPayroll) => void;
}) {
  const [nilai, setNilai] = useState({
    gajiPokok: String(awal.gajiPokok),
    tunjangan: String(awal.tunjangan),
    potonganTelat: String(awal.potonganTelat),
    kasbon: String(awal.kasbon),
  });
  const [menunggu, mulai] = useTransition();

  const angka = {
    gajiPokok: Number(nilai.gajiPokok) || 0,
    tunjangan: Number(nilai.tunjangan) || 0,
    potonganTelat: Number(nilai.potonganTelat) || 0,
    kasbon: Number(nilai.kasbon) || 0,
  };
  const diterima = takeHomePay(angka);
  const peringatan = melebihiPendapatan(angka);

  function simpan() {
    const form = new FormData();
    form.set("userId", awal.userId);
    form.set("periode", periode);
    for (const [key] of KOMPONEN) form.set(key, nilai[key]);

    mulai(async () => onPesan(await simpanPayroll(form)));
  }

  return (
    <tr className="border-b border-line/70 last:border-0">
      <th scope="row" className="p-3 text-left">
        <span className="font-medium">{awal.nama}</span>
        <span className="block text-xs font-normal text-muted">{awal.cabang}</span>
      </th>
      {KOMPONEN.map(([key, label]) => (
        <td key={key} className="p-2 text-right">
          <label className="sr-only" htmlFor={`${key}-${awal.userId}`}>
            {label} {awal.nama}
          </label>
          <input
            id={`${key}-${awal.userId}`}
            name={key}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={nilai[key]}
            onChange={(e) => setNilai((n) => ({ ...n, [key]: e.target.value }))}
            className="w-32 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-right tabular-nums"
          />
        </td>
      ))}
      <td className="p-3 text-right tabular-nums">
        {awal.menitTelatRekap} m
        <span className="block text-xs font-normal text-muted">periode ini</span>
      </td>
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.kasbonDisetujuiSisa)}
        <span className="block text-xs font-normal text-muted">sisa disetujui</span>
      </td>
      <td className="p-3 text-right tabular-nums">
        <span className={peringatan ? "text-status-alpa" : "font-medium"}>
          {formatRupiah(diterima)}
        </span>
        {peringatan ? (
          <span className="block text-xs text-status-alpa">potongan berlebih</span>
        ) : null}
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={menunggu}
            onClick={simpan}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-40"
          >
            {menunggu ? "Menyimpan…" : "Simpan"}
          </button>
          <button
            type="button"
            disabled={menunggu}
            title="Isi kolom kasbon dari sisa kasbon disetujui; belum tersimpan sampai Simpan ditekan"
            onClick={() =>
              setNilai((n) => ({ ...n, kasbon: String(awal.kasbonDisetujuiSisa) }))
            }
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Isi kasbon dari pengajuan
          </button>
        </div>
      </td>
    </tr>
  );
}

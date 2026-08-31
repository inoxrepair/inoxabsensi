"use client";

import { kodeShift } from "@/lib/spreadsheet";
import { formatTanggalPanjang } from "@/lib/format";
import { namaHari } from "@/lib/waktu";
import type { BarisJadwal, Shift } from "./matriks-jadwal";

export function SpreadsheetJadwal({
  tanggal,
  baris,
  shift,
}: {
  tanggal: string[];
  baris: BarisJadwal[];
  shift: Shift[];
}) {
  const namaShift = new Map(shift.map((s) => [s.id, s.nama]));
  return (
    <section className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Preview Spreadsheet</h2>
          <p className="text-xs text-muted">P = Pagi, S = Siang, F = Full, Off = hari libur</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="min-w-max border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 border-b border-r border-line bg-surface p-2 text-left">Karyawan</th>
              {tanggal.map((tgl) => (
                <th key={tgl} className="min-w-12 border-b border-r border-line p-1.5 text-center font-medium">
                  <span className="block">{namaHari(tgl, true)}</span>
                  <span className="block max-w-20 whitespace-normal text-[10px] leading-tight text-muted">{formatTanggalPanjang(tgl)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((row) => (
              <tr key={row.userId}>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper p-2 text-left font-medium">
                  {row.nama}
                  <span className="block font-normal text-muted">{row.cabang}</span>
                </th>
                {tanggal.map((tgl, i) => {
                  const cell = row.hari[i];
                  const kode = cell ? kodeShift(namaShift.get(cell.shiftId) ?? "-") : "Off";
                  return <td key={tgl} className={`border-b border-r border-line p-2 text-center font-semibold tabular-nums ${kode === "Off" ? "bg-status-alpa/10 text-status-alpa" : ""}`}>{kode}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

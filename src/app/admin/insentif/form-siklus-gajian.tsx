"use client";

import { useActionState } from "react";
import {
  simpanSiklusGajianForm,
  type HasilSiklusGajian,
} from "./actions";

/**
 * Form ubah tanggal siklus gajian (tanggal awal bulan sebelumnya dan
 * tanggal akhir bulan periode). Disimpan di tabel Pengaturan dan langsung
 * dipakai sinkron berikutnya — tanpa deploy ulang.
 */
export function FormSiklusGajian({
  awal,
  akhir,
}: {
  awal: number;
  akhir: number;
}) {
  const [hasil, kirim, sedangProses] = useActionState<
    HasilSiklusGajian | undefined,
    FormData
  >(simpanSiklusGajianForm, undefined);

  return (
    <div>
      <form action={kirim} className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-muted flex flex-col gap-1">
          Tanggal awal (bulan sebelumnya)
          <input
            type="number"
            name="awal"
            min={1}
            max={31}
            defaultValue={awal}
            required
            className="w-20 rounded border bg-paper px-2 py-1 text-sm text-ink"
          />
        </label>
        <label className="text-sm text-muted flex flex-col gap-1">
          Tanggal akhir (bulan periode)
          <input
            type="number"
            name="akhir"
            min={1}
            max={31}
            defaultValue={akhir}
            required
            className="w-20 rounded border bg-paper px-2 py-1 text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={sedangProses}
          className="rounded-lg bg-ink px-3 py-1 text-sm font-medium text-paper hover:bg-ink/90 transition disabled:opacity-40"
        >
          {sedangProses ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
      {hasil?.pesan ? (
        <p
          role="status"
          className={`mt-2 text-sm ${hasil.ok ? "text-status-hadir" : "text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}
    </div>
  );
}

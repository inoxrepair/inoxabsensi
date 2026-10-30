"use client";

import { formatTanggal } from "@/lib/format";

export type RingkasanMassal = {
  judul: string;
  karyawan: number;
  dari: string;
  sampai: string;
  jumlahHari: number;
  barisDihapus: number;
  barisDibuat: number;
  catatan?: string;
};

/**
 * Dialog konfirmasi kedua untuk operasi massal jadwal. Ringkasan berasal
 * dari aksi preview server (tanpa menulis); eksekusi hanya terjadi bila
 * pengguna menekan "Ya, jalankan". Peringatan menggantikan dibuat eksplisit
 * karena semua operasi ini delete+create dan tidak ada undo di aplikasi
 * selain backup JSON yang diunduh pengguna sendiri.
 */
export function DialogKonfirmasiMassal({
  ringkasan,
  sedang,
  onBatal,
  onKonfirmasi,
}: {
  ringkasan: RingkasanMassal;
  sedang: boolean;
  onBatal: () => void;
  onKonfirmasi: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="konfirmasi-massal"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-xl">
        <h2 id="konfirmasi-massal" className="font-semibold">
          {ringkasan.judul}
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Karyawan</dt>
            <dd className="tabular-nums font-medium">{ringkasan.karyawan}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Rentang</dt>
            <dd className="tabular-nums font-medium">
              {formatTanggal(ringkasan.dari)} s.d. {formatTanggal(ringkasan.sampai)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Jumlah hari</dt>
            <dd className="tabular-nums font-medium">{ringkasan.jumlahHari}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Baris lama yang akan dihapus</dt>
            <dd className="tabular-nums font-medium">{ringkasan.barisDihapus}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Baris baru yang akan dibuat</dt>
            <dd className="tabular-nums font-medium">{ringkasan.barisDibuat}</dd>
          </div>
        </dl>
        {ringkasan.catatan ? (
          <p className="mt-3 text-sm text-muted">{ringkasan.catatan}</p>
        ) : null}
        <p className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          Perhatian: aksi ini menggantikan data, bukan menggabung, dan tidak
          ada undo di aplikasi kecuali backup JSON yang sudah Anda unduh.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onBatal}
            disabled={sedang}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onKonfirmasi}
            disabled={sedang}
            className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            {sedang ? "Menjalankan…" : "Ya, jalankan"}
          </button>
        </div>
      </div>
    </div>
  );
}

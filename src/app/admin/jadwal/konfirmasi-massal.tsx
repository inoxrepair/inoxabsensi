"use client";

import { formatTanggal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open onOpenChange={(buka) => { if (!buka) onBatal(); }}>
      <DialogContent className="p-5">
        <DialogHeader>
          <DialogTitle id="konfirmasi-massal">{ringkasan.judul}</DialogTitle>
        </DialogHeader>
        <dl className="space-y-1 text-sm">
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
          <p className="text-sm text-muted">{ringkasan.catatan}</p>
        ) : null}
        <p className="rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          Perhatian: aksi ini menggantikan data, bukan menggabung, dan tidak
          ada undo di aplikasi kecuali backup JSON yang sudah Anda unduh.
        </p>
        <DialogFooter className="flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBatal}
            disabled={sedang}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={onKonfirmasi}
            disabled={sedang}
            className="flex-1"
          >
            {sedang ? "Menjalankan…" : "Ya, jalankan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

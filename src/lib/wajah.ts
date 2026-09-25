/**
 * Label & warna status verifikasi wajah untuk HISTORI yang sudah tercatat.
 *
 * Fitur pendaftaran dan verifikasi wajah baru sudah dihapus. File ini hanya
 * dipertahankan agar Log Absensi dan Arsip PDF tetap dapat menampilkan data
 * lama (`Absensi.faceStatus` / `faceJarak`). Kolom database tidak dihapus
 * agar tidak ada data yang hilang.
 */

export const STATUS_WAJAH = ["cocok", "tidak_cocok", "belum_daftar"] as const;
export type StatusWajah = (typeof STATUS_WAJAH)[number];

export const LABEL_STATUS_WAJAH: Record<StatusWajah, string> = {
  cocok: "Wajah cocok",
  tidak_cocok: "Wajah tidak cocok",
  belum_daftar: "Wajah belum didaftarkan",
};

export function bacaStatusWajah(nilai: string | null | undefined): StatusWajah | null {
  return STATUS_WAJAH.includes(nilai as StatusWajah)
    ? (nilai as StatusWajah)
    : null;
}

export const WARNA_STATUS_WAJAH: Record<StatusWajah, string> = {
  cocok: "text-status-hadir",
  tidak_cocok: "text-status-alpa",
  belum_daftar: "text-muted",
};

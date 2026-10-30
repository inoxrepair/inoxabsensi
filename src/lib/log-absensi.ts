import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";
import {
  keMenit,
  keterlambatanKotor,
  menitTelat,
  toleransiTerpakai,
} from "@/lib/waktu";
import type { StatusAbsensi } from "@/lib/domain";

const STATUS = ["hadir", "telat", "izin", "alpa", "libur"] as const;

export type HasilAbsensi = { ok: boolean; pesan: string };

/**
 * Koreksi manual harus ikut memperbarui akumulasi telat. Status selain
 * "telat" selalu nol; status telat dihitung ulang dari shift pada tanggal itu.
 */
export function hitungMenitTelatKoreksi(
  status: StatusAbsensi,
  masuk: number | null,
  shift: { mulaiMenit: number; toleransiMenit: number } | null,
): number {
  if (status !== "telat" || masuk === null || !shift) return 0;
  return menitTelat(masuk, shift);
}

/**
 * Snapshot keterlambatan untuk edit log, sejalan dengan snapshot check-in:
 * menitKotor = menitToleransi + menitTelat. Status bukan telat, tanpa jam
 * masuk, tanpa shift, atau mode fleksibel menghasilkan ketiganya 0.
 */
export function hitungSnapshotKoreksi(
  status: StatusAbsensi,
  masuk: number | null,
  shift: { mulaiMenit: number; toleransiMenit: number } | null,
  modeShift?: string | null,
): { menitTelat: number; menitToleransi: number; menitKotor: number } {
  const nol = { menitTelat: 0, menitToleransi: 0, menitKotor: 0 };
  if (status !== "telat" || masuk === null || !shift) return nol;
  if (modeShift === "fleksibel") return nol;
  return {
    menitTelat: menitTelat(masuk, shift),
    menitToleransi: toleransiTerpakai(masuk, shift),
    menitKotor: keterlambatanKotor(masuk, shift),
  };
}

/**
 * Status efektif setelah koreksi: "telat" yang jamnya masih di dalam
 * toleransi (atau tanpa shift pembanding) diluruskan menjadi "hadir" agar
 * Rekap tidak menampilkan "telat 1 kali, 0 menit". Arah sebaliknya sengaja
 * tidak diubah: "hadir" yang lewat toleransi tetap 0 sebagai bentuk
 * pembolehan manual oleh admin.
 */
export function statusEfektif(
  status: StatusAbsensi,
  masuk: number | null,
  shift: { mulaiMenit: number; toleransiMenit: number } | null,
): StatusAbsensi {
  if (
    status === "telat" &&
    hitungMenitTelatKoreksi(status, masuk, shift) === 0
  ) {
    return "hadir";
  }
  return status;
}

/**
 * Gabungkan catatan edit tanpa menumpuk suffix "Diedit manual." pada
 * edit berulang: form sudah terisi catatan lama yang mengandung suffix
 * itu, jadi buang segmen lama dulu sebelum menambah yang baru.
 */
export function gabungCatatanEdit(catatan?: string | null): string {
  const bersih = (catatan ?? "")
    .split("·")
    .map((bagian) => bagian.trim())
    .filter((bagian) => bagian && bagian !== "Diedit manual.")
    .join(" · ");
  return bersih ? `${bersih} · Diedit manual.` : "Diedit manual.";
}

/** Validasi form koreksi log absensi, bukan server action. */
export const editAbsensiSkema = z
  .object({
    id: z.string().min(1),
    tanggal: z.string().refine(tanggalValid, "Tanggal tidak valid."),
    status: z.enum(STATUS),
    masuk: z
      .string()
      .optional()
      .transform((v) => (v ? keMenit(v) : null)),
    keluar: z
      .string()
      .optional()
      .transform((v) => (v ? keMenit(v) : null)),
    catatan: z
      .string()
      .trim()
      .max(300, "Catatan maksimal 300 karakter.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.status === "hadir" || data.status === "telat") &&
      data.masuk === null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["masuk"],
        message: "Jam masuk wajib untuk status hadir/telat.",
      });
    }
    if (data.keluar !== null && data.masuk === null) {
      ctx.addIssue({
        code: "custom",
        path: ["keluar"],
        message: "Jam keluar hanya boleh diisi bila ada jam masuk.",
      });
    }
  });

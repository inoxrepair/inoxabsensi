import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";
import { keMenit, menitTelat } from "@/lib/waktu";
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

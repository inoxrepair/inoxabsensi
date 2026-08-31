import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";
import { keMenit } from "@/lib/waktu";

const STATUS = ["hadir", "telat", "izin", "alpa", "libur"] as const;

export type HasilAbsensi = { ok: boolean; pesan: string };

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

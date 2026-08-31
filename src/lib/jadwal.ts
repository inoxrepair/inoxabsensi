import { z } from "zod";
import { keMenit } from "@/lib/waktu";

/**
 * Validasi shift & jadwal. Dipisah dari server action supaya bisa diuji
 * tanpa database, seperti lib/cabang.ts dan lib/absensi.ts.
 */

export const TOLERANSI_MAKS = 120;

/** Jam ditulis "09.00" atau "09:00" lalu disimpan sebagai menit. */
const jam = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const m = keMenit(v);
    if (m === null) {
      ctx.addIssue({ code: "custom", message: "Format jam harus HH.MM." });
      return z.NEVER;
    }
    return m;
  });

export const shiftSkema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(2, "Nama shift minimal 2 karakter.")
      .max(30, "Nama shift maksimal 30 karakter."),
    jamMulai: jam,
    jamSelesai: jam,
    toleransiMenit: z.preprocess(
      (v) =>
        typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v,
      z
        .number({ error: "Toleransi wajib diisi." })
        .int("Toleransi harus bilangan bulat.")
        .min(0, "Toleransi tidak boleh negatif.")
        .max(TOLERANSI_MAKS, `Toleransi maksimal ${TOLERANSI_MAKS} menit.`),
    ),
  })
  .refine((d) => d.jamMulai !== d.jamSelesai, {
    message: "Jam mulai dan selesai tidak boleh sama.",
    path: ["jamSelesai"],
  })
  .transform(({ jamMulai, jamSelesai, ...sisa }) => ({
    ...sisa,
    mulaiMenit: jamMulai,
    selesaiMenit: jamSelesai,
  }));

export type DataShift = z.output<typeof shiftSkema>;

/** Satu sel matriks: "" berarti libur (shift dihapus). */
export const selJadwalSkema = z.object({
  userId: z.string().min(1, "Karyawan tidak valid."),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  shiftId: z.string().transform((v) => (v === "" ? null : v)),
  seragamId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

export type SelJadwal = z.output<typeof selJadwalSkema>;

/**
 * Catatan desain: shift TIDAK divalidasi terhadap tumpang-tindih jam.
 * Shift yang bertumpuk itu normal — "Full" (09.00-22.00) memang mencakup
 * jam "Pagi" dan "Siang" karena karyawan berbeda memakai shift berbeda pada
 * hari yang sama. Bentrok hanya mungkin bila satu karyawan punya dua shift
 * di tanggal sama, dan itu sudah dicegah unique constraint (userId, tanggal)
 * pada tabel Jadwal.
 */

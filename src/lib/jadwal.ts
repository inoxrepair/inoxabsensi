import { z } from "zod";
import { keMenit } from "@/lib/waktu";

/**
 * Validasi shift & jadwal. Dipisah dari server action supaya bisa diuji
 * tanpa database, seperti lib/cabang.ts dan lib/absensi.ts.
 */

export const TOLERANSI_MAKS = 120;
export const CYCLE_MAKS = 3;
export const MODE_SHIFT = ["terjadwal", "fleksibel"] as const;

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
    mode: z.enum(MODE_SHIFT).default("terjadwal"),
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
    minimumKerjaJam: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
      z.number().min(0, "Minimum jam tidak boleh negatif.").max(24, "Minimum jam maksimal 24.").nullable(),
    ),
    maksimalCycle: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : 1),
      z.number().int("Maksimal cycle harus bilangan bulat.").min(1).max(CYCLE_MAKS),
    ),
  })
  .refine((d) => d.jamMulai !== d.jamSelesai, {
    message: "Jam mulai dan selesai tidak boleh sama.",
    path: ["jamSelesai"],
  })
  .transform(({ jamMulai, jamSelesai, minimumKerjaJam, ...sisa }) => ({
    ...sisa,
    mulaiMenit: jamMulai,
    selesaiMenit: jamSelesai,
    minimumKerjaMenit: minimumKerjaJam === null ? null : Math.round(minimumKerjaJam * 60),
    maksimalCycle: sisa.mode === "fleksibel" ? sisa.maksimalCycle : 1,
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

import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";

export const backupJadwalSkema = z.object({
  version: z.literal(1),
  dibuatPada: z.string(),
  dari: z.string().refine(tanggalValid),
  sampai: z.string().refine(tanggalValid),
  data: z.array(
    z.object({
      username: z.string().nullable(),
      email: z.string().email(),
      tanggal: z.string().refine(tanggalValid),
      shift: z.string(),
      seragamKode: z.string().nullable(),
    }),
  ).max(100_000),
});

export type BackupJadwal = z.infer<typeof backupJadwalSkema>;

/** Kelompokkan tanggal per user agar restore tidak menghapus kombinasi silang. */
export function kelompokTanggalRestore(
  data: readonly { userId: string; tanggal: string }[],
): { userId: string; tanggal: string[] }[] {
  const perUser = new Map<string, Set<string>>();

  for (const row of data) {
    const tanggal = perUser.get(row.userId) ?? new Set<string>();
    tanggal.add(row.tanggal);
    perUser.set(row.userId, tanggal);
  }

  return [...perUser].map(([userId, tanggal]) => ({
    userId,
    tanggal: [...tanggal],
  }));
}

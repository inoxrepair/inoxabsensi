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

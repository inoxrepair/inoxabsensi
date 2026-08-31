import { z } from "zod";

export const seragamSkema = z.object({
  kode: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Kode minimal 2 karakter.")
    .max(20, "Kode maksimal 20 karakter.")
    .regex(/^[A-Z0-9_-]+$/, "Kode hanya boleh huruf besar, angka, underscore, dan strip."),
  nama: z
    .string()
    .trim()
    .min(3, "Nama seragam minimal 3 karakter.")
    .max(60, "Nama seragam maksimal 60 karakter."),
  deskripsi: z
    .string()
    .trim()
    .max(200, "Deskripsi maksimal 200 karakter.")
    .optional()
    .transform((v) => v || null),
  aktif: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type DataSeragam = z.output<typeof seragamSkema>;

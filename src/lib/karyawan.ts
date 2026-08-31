import { z } from "zod";
import { ROLE } from "@/lib/domain";
import { tanggalValid } from "@/lib/rekap";

/** Validasi data akun karyawan/admin. */
export const karyawanSkema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username minimal 3 karakter.")
      .max(30, "Username maksimal 30 karakter.")
      .regex(/^[a-z0-9._-]+$/, "Username hanya boleh berisi huruf kecil, angka, titik, underscore, atau strip."),
    name: z
      .string()
      .trim()
      .min(3, "Nama minimal 3 karakter.")
      .max(80, "Nama maksimal 80 karakter."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Format email tidak valid.")
      .max(120, "Email maksimal 120 karakter."),
    jabatan: z
      .string()
      .trim()
      .min(2, "Jabatan minimal 2 karakter.")
      .max(60, "Jabatan maksimal 60 karakter."),
    tanggalMasuk: z
      .string()
      .refine(tanggalValid, "Tanggal masuk tidak valid."),
    role: z.enum(ROLE),
    cabangId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null)),
    aktif: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    // Saat edit, kosong berarti password lama dipertahankan.
    password: z.string().optional().transform((v) => v?.trim() ?? ""),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password minimal 8 karakter.",
      });
    }
    if (data.role !== "super_admin" && !data.cabangId) {
      ctx.addIssue({
        code: "custom",
        path: ["cabangId"],
        message: "Cabang wajib dipilih untuk role ini.",
      });
    }
  });

export type DataKaryawan = z.output<typeof karyawanSkema>;

/** Validasi create: password selalu wajib. */
export function validasiKaryawan(
  data: Record<string, unknown>,
  membuat: boolean,
) {
  const hasil = karyawanSkema.safeParse(data);
  if (!hasil.success) return hasil;

  if (membuat && hasil.data.password.length < 8) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["password"],
          message: "Password wajib diisi minimal 8 karakter.",
        },
      ]),
    };
  }
  return hasil;
}

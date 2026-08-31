import { z } from "zod";

export const loginSkema = z.object({
  identifier: z.string().trim().min(3, "Username atau email wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export const gantiPasswordSkema = z
  .object({
    passwordLama: z.string().min(1, "Password lama wajib diisi."),
    passwordBaru: z.string().min(8, "Password baru minimal 8 karakter."),
    konfirmasi: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((d) => d.passwordBaru === d.konfirmasi, {
    path: ["konfirmasi"],
    message: "Konfirmasi password tidak sama.",
  })
  .refine((d) => d.passwordLama !== d.passwordBaru, {
    path: ["passwordBaru"],
    message: "Password baru harus berbeda dari password lama.",
  });

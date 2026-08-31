"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";

const skema = z.object({
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
  next: z.string().optional(),
});

export type StatusLogin = { pesan: string } | undefined;

/** Hanya izinkan path internal agar tidak bisa dipakai open redirect. */
function tujuanAman(next?: string) {
  return next && /^\/(admin|karyawan)(\/|$)/.test(next) ? next : "/";
}

export async function masuk(
  _sebelumnya: StatusLogin,
  formData: FormData,
): Promise<StatusLogin> {
  const parsed = skema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { pesan: parsed.error.issues[0].message };
  }

  try {
    // redirectTo "/" dibiarkan diproses proxy, yang mengarahkan
    // ke /admin atau /karyawan sesuai role.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: tujuanAman(parsed.data.next),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Pesan seragam: tidak membocorkan apakah email terdaftar.
      return { pesan: "Email atau password salah." };
    }
    // signIn melempar NEXT_REDIRECT saat berhasil; jangan ditelan.
    throw error;
  }
}

export async function masukGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function keluar() {
  await signOut({ redirectTo: "/login" });
}

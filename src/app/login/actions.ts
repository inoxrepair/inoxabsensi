"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { loginSkema } from "@/lib/akun";

const skema = loginSkema.extend({ next: z.string().optional() });

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
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      redirectTo: tujuanAman(parsed.data.next),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Pesan seragam: tidak membocorkan apakah akun terdaftar.
      return { pesan: "Username/email atau password salah." };
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

"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { loginSkema } from "@/lib/akun";
import {
  batasLoginTercapai,
  catatGagalLogin,
  resetGagalLogin,
} from "@/lib/rate-limit";

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

  // IP hanya dipakai sebagai bagian kunci rate limit, tidak ditampilkan.
  const header = await headers();
  const ip =
    header.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    header.get("x-real-ip") ||
    "tidak-diketahui";
  const identifier = parsed.data.identifier;
  if (batasLoginTercapai(identifier, ip)) {
    // Pesan generik: tidak membocorkan apakah akun ada maupun apakah
    // batas tercapai karena identifier atau IP.
    return { pesan: "Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi." };
  }

  try {
    // redirectTo "/" dibiarkan diproses proxy, yang mengarahkan
    // ke /admin atau /karyawan sesuai role.
    await signIn("credentials", {
      identifier,
      password: parsed.data.password,
      redirectTo: tujuanAman(parsed.data.next),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Pesan seragam: tidak membocorkan apakah akun terdaftar.
      // Kegagalan validasi skema di atas tidak dihitung; hanya kegagalan
      // kredensial yang dihitung agar form kosong tidak mengunci akun.
      catatGagalLogin(identifier, ip);
      return { pesan: "Username/email atau password salah." };
    }
    // signIn melempar NEXT_REDIRECT saat berhasil; jangan ditelan.
    throw error;
  }
  // signIn yang berhasil tidak mencapai baris ini karena redirect, tetapi
  // reset tetap ditulis untuk kejelasan: jalur sukses tidak menambah hitungan.
  resetGagalLogin(identifier, ip);
}

export async function masukGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function keluar() {
  await signOut({ redirectTo: "/login" });
}

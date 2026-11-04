"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { wajibLogin } from "@/lib/session";
import { gantiPasswordSkema } from "@/lib/akun";

/**
 * Foto profil disimpan di kolom User.image yang sudah ada (dipakai Auth.js),
 * jadi tidak perlu migrasi database baru. Foto disimpan sebagai data URL
 * JPEG yang sudah dikompresi di HP (maks. 512 px), bukan file di disk —
 * supaya foto ikut tersimpan di backup database dan tidak hilang saat
 * container di-rebuild di VPS. Hanya pemilik akun yang bisa mengubah
 * fotonya sendiri (id diambil dari sesi, bukan dari form).
 */
export type HasilFoto = { ok: boolean; pesan: string } | undefined;

const TIPE_FOTO_DIIZINKAN = ["image/jpeg", "image/png", "image/webp"];
const MAKS_UKURAN_FOTO = 2_000_000; // 2 MB; hasil kompresi HP biasanya < 300 KB

export async function simpanFotoProfil(
  formData: FormData,
): Promise<HasilFoto> {
  const sesi = await wajibLogin();
  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return { ok: false, pesan: "Pilih foto dulu." };
  }
  if (!TIPE_FOTO_DIIZINKAN.includes(foto.type)) {
    return { ok: false, pesan: "Foto harus JPG, PNG, atau WebP." };
  }
  if (foto.size > MAKS_UKURAN_FOTO) {
    return { ok: false, pesan: "Foto terlalu besar (maks. 2 MB)." };
  }

  const base64 = Buffer.from(await foto.arrayBuffer()).toString("base64");
  await db.user.update({
    where: { id: sesi.id },
    data: { image: `data:${foto.type};base64,${base64}` },
  });
  revalidatePath("/karyawan/profil");
  return { ok: true, pesan: "Foto profil berhasil disimpan." };
}

export async function hapusFotoProfil(): Promise<HasilFoto> {
  const sesi = await wajibLogin();
  await db.user.update({
    where: { id: sesi.id },
    data: { image: null },
  });
  revalidatePath("/karyawan/profil");
  return { ok: true, pesan: "Foto profil dihapus, kembali ke inisial." };
}

export type HasilPassword = { ok: boolean; pesan: string } | undefined;

export async function gantiPassword(
  _sebelumnya: HasilPassword,
  formData: FormData,
): Promise<HasilPassword> {
  const sesi = await wajibLogin();
  const parsed = gantiPasswordSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { id: sesi.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return {
      ok: false,
      pesan: "Akun ini belum memiliki password lokal. Hubungi administrator.",
    };
  }

  if (!(await compare(parsed.data.passwordLama, user.passwordHash))) {
    return { ok: false, pesan: "Password lama salah." };
  }

  await db.user.update({
    where: { id: sesi.id },
    data: { passwordHash: await hash(parsed.data.passwordBaru, 10) },
  });

  return { ok: true, pesan: "Password berhasil diubah." };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { KUNCI_LOGO_APLIKASI } from "@/lib/pengaturan";
import { wajibAkses } from "@/lib/session";

/**
 * Logo aplikasi: satu logo untuk semua cabang, hanya yang punya akses menu
 * "pengaturan" (praktisnya super admin) yang boleh mengubahnya. Disimpan
 * sebagai data URL di tabel Pengaturan, supaya ikut backup database dan
 * tidak hilang saat container di-rebuild.
 */
export type HasilLogo = { ok: boolean; pesan: string } | undefined;

const TIPE_LOGO_DIIZINKAN = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAKS_UKURAN_LOGO = 2_000_000; // 2 MB

export async function simpanLogoAplikasi(
  formData: FormData,
): Promise<HasilLogo> {
  await wajibAkses("pengaturan");
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return { ok: false, pesan: "Pilih gambar logo dulu." };
  }
  if (!TIPE_LOGO_DIIZINKAN.includes(logo.type)) {
    return { ok: false, pesan: "Logo harus PNG, JPG, WebP, atau SVG." };
  }
  if (logo.size > MAKS_UKURAN_LOGO) {
    return { ok: false, pesan: "Logo terlalu besar (maks. 2 MB)." };
  }

  const base64 = Buffer.from(await logo.arrayBuffer()).toString("base64");
  const nilai = `data:${logo.type};base64,${base64}`;
  // SQL mentah (lihat lib/pengaturan.ts kenapa): update dulu, insert bila
  // belum ada — cara ini jalan di Postgres maupun SQLite tanpa ON CONFLICT.
  const diubah = await db.$executeRaw`
    UPDATE "Pengaturan" SET "nilai" = ${nilai}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
  `;
  if (diubah === 0) {
    await db.$executeRaw`
      INSERT INTO "Pengaturan" ("kunci", "nilai") VALUES (${KUNCI_LOGO_APLIKASI}, ${nilai})
    `;
  }
  revalidatePath("/admin/pengaturan");
  return { ok: true, pesan: "Logo aplikasi berhasil disimpan." };
}

export async function hapusLogoAplikasi(): Promise<HasilLogo> {
  await wajibAkses("pengaturan");
  await db.$executeRaw`
    DELETE FROM "Pengaturan" WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
  `.catch(() => null);
  revalidatePath("/admin/pengaturan");
  return { ok: true, pesan: "Logo dikembalikan ke logo iNOX bawaan." };
}

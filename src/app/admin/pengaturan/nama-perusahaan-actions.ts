"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { KUNCI_NAMA_PERUSAHAAN } from "@/lib/pengaturan";
import { wajibAkses } from "@/lib/session";

/**
 * Nama perusahaan untuk slip gaji: satu nama untuk semua cabang, hanya yang
 * punya akses menu "pengaturan" (praktisnya super admin) yang boleh
 * mengubahnya. Disimpan di tabel Pengaturan, supaya ikut backup database
 * dan tidak hilang saat container di-rebuild.
 */
export type HasilNamaPerusahaan = { ok: boolean; pesan: string } | undefined;

const MAKS_PANJANG_NAMA = 100;

export async function simpanNamaPerusahaan(
  formData: FormData,
): Promise<HasilNamaPerusahaan> {
  await wajibAkses("pengaturan");
  const nama = String(formData.get("nama") ?? "").trim();
  if (nama.length > MAKS_PANJANG_NAMA) {
    return { ok: false, pesan: "Nama perusahaan terlalu panjang (maks. 100 karakter)." };
  }
  if (!nama) {
    // Dikosongkan = kembali ke nama bawaan "iNOX Repair".
    await db.$executeRaw`
      DELETE FROM "Pengaturan" WHERE "kunci" = ${KUNCI_NAMA_PERUSAHAAN}
    `.catch(() => null);
    revalidatePath("/admin/pengaturan");
    return { ok: true, pesan: "Nama perusahaan dikembalikan ke iNOX Repair." };
  }
  // SQL mentah (lihat lib/pengaturan.ts kenapa): update dulu, insert bila
  // belum ada — cara ini jalan di Postgres maupun SQLite tanpa ON CONFLICT.
  const diubah = await db.$executeRaw`
    UPDATE "Pengaturan" SET "nilai" = ${nama}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "kunci" = ${KUNCI_NAMA_PERUSAHAAN}
  `;
  if (diubah === 0) {
    await db.$executeRaw`
      INSERT INTO "Pengaturan" ("kunci", "nilai") VALUES (${KUNCI_NAMA_PERUSAHAAN}, ${nama})
    `;
  }
  revalidatePath("/admin/pengaturan");
  return { ok: true, pesan: "Nama perusahaan berhasil disimpan." };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { KUNCI_ADMIN_CABANG_LIHAT_GAJI } from "@/lib/pengaturan";
import { wajibAkses } from "@/lib/session";

/**
 * Toggle "admin cabang boleh melihat gaji" (menu Payroll + Slip Gaji).
 * Hanya super admin (pemegang menu Pengaturan) yang boleh mengubahnya.
 * Disimpan di tabel Pengaturan ("1" = boleh, "0" = tidak) supaya ikut
 * backup database. Perubahan langsung berlaku: sidebar admin cabang
 * menyembunyikan/menampilkan kedua menu itu dan URL-nya ikut ditolak/dibuka.
 */
export type HasilGajiAdminCabang = { ok: boolean; pesan: string };

export async function ubahAdminCabangLihatGaji(
  formData: FormData,
): Promise<HasilGajiAdminCabang> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat mengubah pengaturan ini." };
  }
  const boleh = formData.get("diizinkan") === "1";
  const nilai = boleh ? "1" : "0";
  // SQL mentah (lihat lib/pengaturan.ts kenapa): update dulu, insert bila
  // belum ada — cara ini jalan di Postgres maupun SQLite tanpa ON CONFLICT.
  const diubah = await db.$executeRaw`
    UPDATE "Pengaturan" SET "nilai" = ${nilai}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "kunci" = ${KUNCI_ADMIN_CABANG_LIHAT_GAJI}
  `;
  if (diubah === 0) {
    await db.$executeRaw`
      INSERT INTO "Pengaturan" ("kunci", "nilai") VALUES (${KUNCI_ADMIN_CABANG_LIHAT_GAJI}, ${nilai})
    `;
  }
  revalidatePath("/admin/pengaturan");
  return {
    ok: true,
    pesan: boleh
      ? "Admin cabang kini dapat melihat gaji cabangnya (menu Payroll dan Slip Gaji)."
      : "Admin cabang tidak lagi dapat melihat gaji (menu Payroll dan Slip Gaji disembunyikan).",
  };
}

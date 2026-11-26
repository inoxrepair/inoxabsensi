"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { payrollSkema } from "@/lib/payroll";
import { wajibAkses } from "@/lib/session";

export type HasilPayroll = { ok: boolean; pesan: string };

/** Simpan seluruh komponen gaji satu karyawan untuk satu periode. */
export async function simpanPayroll(formData: FormData): Promise<HasilPayroll> {
  const admin = await wajibAkses("payroll");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat mengubah payroll." };
  }

  const parsed = payrollSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const { userId, periode, ...komponen } = parsed.data;

  // Jangan percaya userId dari form; pastikan target adalah karyawan aktif.
  const target = await db.user.findFirst({
    where: { id: userId, aktif: true, role: { not: "super_admin" } },
    select: { name: true },
  });
  if (!target) return { ok: false, pesan: "Karyawan tidak ditemukan." };

  // Upsert mentah: client Prisma lokal belum mengenal kolom
  // penyesuaian/keteranganPenyesuaian (prisma generate gagal di VM ini).
  // ON CONFLICT jalan di Postgres maupun SQLite; "updatedAt" diisi
  // manual karena @updatedAt hanya jalan lewat client Prisma, bukan di
  // database. Keterangan kosong disimpan null (bukan string kosong).
  const keterangan = komponen.keteranganPenyesuaian?.trim() || null;
  await db.$executeRaw`
    INSERT INTO "Payroll" ("id", "userId", "periode", "gajiPokok",
      "tunjangan", "kasbon", "penyesuaian", "keteranganPenyesuaian")
    VALUES (${randomUUID()}, ${userId}, ${periode}, ${komponen.gajiPokok},
      ${komponen.tunjangan}, ${komponen.kasbon}, ${komponen.penyesuaian},
      ${keterangan})
    ON CONFLICT ("userId", "periode") DO UPDATE SET
      "gajiPokok" = EXCLUDED."gajiPokok",
      "tunjangan" = EXCLUDED."tunjangan",
      "kasbon" = EXCLUDED."kasbon",
      "penyesuaian" = EXCLUDED."penyesuaian",
      "keteranganPenyesuaian" = EXCLUDED."keteranganPenyesuaian",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  revalidatePath("/admin/payroll");
  return { ok: true, pesan: `Payroll ${target.name} tersimpan.` };
}

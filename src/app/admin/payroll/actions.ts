"use server";

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

  await db.payroll.upsert({
    where: { userId_periode: { userId, periode } },
    update: komponen,
    create: { userId, periode, ...komponen },
  });

  revalidatePath("/admin/payroll");
  return { ok: true, pesan: `Payroll ${target.name} tersimpan.` };
}

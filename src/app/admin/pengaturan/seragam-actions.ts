"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { seragamSkema } from "@/lib/seragam";
import { wajibAkses } from "@/lib/session";

export type HasilSeragam = { ok: boolean; pesan: string };

export async function simpanSeragam(
  id: string | null,
  formData: FormData,
): Promise<HasilSeragam> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") return { ok: false, pesan: "Hanya Super Admin dapat mengubah seragam." };
  const parsed = seragamSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, pesan: parsed.error.issues[0].message };

  try {
    if (id) await db.jenisSeragam.update({ where: { id }, data: parsed.data });
    else await db.jenisSeragam.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, pesan: "Kode atau nama seragam sudah digunakan." };
    }
    throw e;
  }
  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/jadwal");
  revalidatePath("/karyawan/jadwal");
  return { ok: true, pesan: id ? "Seragam diperbarui." : "Seragam dibuat." };
}

export async function ubahStatusSeragam(id: string, aktif: boolean): Promise<HasilSeragam> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") return { ok: false, pesan: "Hanya Super Admin dapat mengubah seragam." };
  await db.jenisSeragam.update({ where: { id }, data: { aktif } });
  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/jadwal");
  return { ok: true, pesan: aktif ? "Seragam diaktifkan." : "Seragam dinonaktifkan." };
}

export async function hapusSeragam(id: string): Promise<HasilSeragam> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") return { ok: false, pesan: "Hanya Super Admin dapat menghapus seragam." };
  const dipakai = await db.jadwal.count({ where: { seragamId: id } });
  if (dipakai > 0) return { ok: false, pesan: `Seragam masih dipakai ${dipakai} jadwal. Nonaktifkan saja.` };
  await db.jenisSeragam.delete({ where: { id } });
  revalidatePath("/admin/pengaturan");
  return { ok: true, pesan: "Seragam dihapus." };
}

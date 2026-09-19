"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { embeddingValid, PANJANG_EMBEDDING } from "@/lib/wajah";
import { tanggalLokal } from "@/lib/waktu";

export type HasilWajah = { ok: boolean; pesan: string };

/** Vektor dari klien divalidasi ulang; jangan percaya panjang/tipe dari browser. */
const wajahSkema = z.object({
  userId: z.string().min(1),
  embedding: z
    .array(z.number().finite())
    .length(PANJANG_EMBEDDING, "Vektor wajah harus 128 angka."),
});

/**
 * Simpan vektor wajah karyawan. Hanya admin yang boleh mengakses menu
 * karyawan, dan admin cabang dibatasi ke cabangnya.
 */
export async function simpanWajah(
  userId: string,
  embedding: number[],
): Promise<HasilWajah> {
  const admin = await wajibAkses("karyawan");

  const parsed = wajahSkema.safeParse({ userId, embedding });
  if (!parsed.success || !embeddingValid(parsed.data.embedding)) {
    return { ok: false, pesan: "Data wajah tidak valid. Ulangi pengambilan sampel." };
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, cabangId: true, role: true },
  });
  if (!target) return { ok: false, pesan: "Karyawan tidak ditemukan." };

  if (
    admin.role !== "super_admin" &&
    (target.cabangId !== admin.cabangId || target.role !== "karyawan")
  ) {
    return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      faceEmbedding: JSON.stringify(parsed.data.embedding),
      faceDidaftarkan: tanggalLokal(),
    },
  });

  revalidatePath("/admin/karyawan");
  return { ok: true, pesan: `Wajah ${target.name} berhasil didaftarkan.` };
}

/** Hapus data wajah, misalnya saat karyawan keluar atau pendaftaran salah. */
export async function hapusWajah(userId: string): Promise<HasilWajah> {
  const admin = await wajibAkses("karyawan");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, cabangId: true, role: true },
  });
  if (!target) return { ok: false, pesan: "Karyawan tidak ditemukan." };

  if (
    admin.role !== "super_admin" &&
    (target.cabangId !== admin.cabangId || target.role !== "karyawan")
  ) {
    return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
  }

  await db.user.update({
    where: { id: userId },
    data: { faceEmbedding: null, faceDidaftarkan: null },
  });

  revalidatePath("/admin/karyawan");
  return { ok: true, pesan: `Data wajah ${target.name} dihapus.` };
}
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { cabangSkema } from "@/lib/cabang";

export type HasilSimpan = { ok: boolean; pesan: string };

/** Nama cabang unik di database; ubah error Prisma jadi pesan yang jelas. */
function pesanGalat(e: unknown, nama: string): string {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  ) {
    return `Cabang bernama "${nama}" sudah ada.`;
  }
  throw e;
}

function segarkan() {
  revalidatePath("/admin/cabang");
  // Radius & koordinat dipakai halaman absen karyawan.
  revalidatePath("/karyawan");
}

export async function simpanCabang(
  id: string | null,
  formData: FormData,
): Promise<HasilSimpan> {
  await wajibAkses("cabang");

  const parsed = cabangSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    if (id) {
      await db.cabang.update({ where: { id }, data });
    } else {
      await db.cabang.create({ data });
    }
  } catch (e) {
    return { ok: false, pesan: pesanGalat(e, data.nama) };
  }

  segarkan();
  return {
    ok: true,
    pesan: id ? "Perubahan cabang tersimpan." : `Cabang ${data.nama} dibuat.`,
  };
}

/**
 * Cabang tidak dihapus permanen bila masih dipakai: relasi User dan Absensi
 * akan kehilangan acuan. Nonaktifkan saja agar riwayat tetap utuh.
 * Sengaja tidak ada endpoint hapus cabang di file ini; jangan menambahkan
 * hapus permanen tanpa migrasi audit dan persetujuan pemilik repo, karena
 * cascade Prisma akan menghapus riwayat Absensi cabang tersebut.
 */
export async function ubahStatusCabang(
  id: string,
  aktif: boolean,
): Promise<HasilSimpan> {
  await wajibAkses("cabang");

  await db.cabang.update({ where: { id }, data: { aktif } });
  segarkan();

  return {
    ok: true,
    pesan: aktif ? "Cabang diaktifkan." : "Cabang dinonaktifkan.",
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { editAbsensiSkema, type HasilAbsensi } from "@/lib/log-absensi";
import { wajibAkses } from "@/lib/session";

export async function simpanEditAbsensi(formData: FormData): Promise<HasilAbsensi> {
  const admin = await wajibAkses("karyawan");
  const parsed = editAbsensiSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, pesan: parsed.error.issues[0].message };

  const absensi = await db.absensi.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { cabangId: true } } },
  });
  if (!absensi) return { ok: false, pesan: "Catatan absensi tidak ditemukan." };

  if (roleTerbatasCabang(admin.role)) {
    if (absensi.user.cabangId !== admin.cabangId) {
      return { ok: false, pesan: "Catatan di luar lingkup cabang Anda." };
    }
  }

  const { masuk, keluar, ...data } = parsed.data;
  await db.absensi.update({
    where: { id: parsed.data.id },
    data: {
      ...data,
      masukMenit: masuk,
      keluarMenit: keluar,
      // Kesalahan input membuat data lokasi tidak lagi dianggap akurat.
      catatan: [parsed.data.catatan, "Diedit manual."].filter(Boolean).join(" · "),
      editedBy: admin.id,
    },
  });

  revalidatePath("/admin/log-absensi");
  revalidatePath("/admin");
  return { ok: true, pesan: "Catatan absensi diperbarui." };
}

export async function hapusAbsensi(id: string): Promise<HasilAbsensi> {
  const admin = await wajibAkses("karyawan");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya Super Admin yang dapat menghapus catatan." };
  }

  const absensi = await db.absensi.findUnique({
    where: { id },
    select: { id: true, userId: true, tanggal: true },
  });
  if (!absensi) return { ok: false, pesan: "Catatan tidak ditemukan." };

  await db.absensi.delete({ where: { id } });
  revalidatePath("/admin/log-absensi");
  revalidatePath("/admin");
  revalidatePath("/karyawan/riwayat");

  return {
    ok: true,
    pesan: `Catatan ${absensi.tanggal} dihapus. Pengguna dapat absen lagi.`,
  };
}

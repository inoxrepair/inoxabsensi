"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import {
  editAbsensiSkema,
  hitungMenitTelatKoreksi,
  type HasilAbsensi,
} from "@/lib/log-absensi";
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

  const jadwal = await db.jadwal.findUnique({
    where: {
      userId_tanggal: {
        userId: absensi.userId,
        tanggal: absensi.tanggal,
      },
    },
    select: {
      shift: { select: { mulaiMenit: true, toleransiMenit: true } },
    },
  });

  const { masuk, keluar, status, catatan } = parsed.data;
  const jumlahCycle = await db.absensiCycle.count({ where: { absensiId: absensi.id } });
  const masukAkhir = jumlahCycle > 1 ? absensi.masukMenit : masuk;
  const keluarAkhir = jumlahCycle > 1 ? absensi.keluarMenit : keluar;
  const menitTelat = hitungMenitTelatKoreksi(
    status,
    masukAkhir,
    jadwal?.shift ?? null,
  );
  await db.absensi.update({
    where: { id: parsed.data.id },
    data: {
      status,
      masukMenit: masukAkhir,
      keluarMenit: keluarAkhir,
      menitTelat,
      // Kesalahan input membuat data lokasi tidak lagi dianggap akurat.
      catatan: [catatan, "Diedit manual."].filter(Boolean).join(" · "),
      editedBy: admin.id,
    },
  });
  if (jumlahCycle === 1 && masukAkhir !== null) {
    await db.absensiCycle.updateMany({
      where: { absensiId: absensi.id, urutan: 1 },
      data: { masukMenit: masukAkhir, keluarMenit: keluarAkhir },
    });
  }

  revalidatePath("/admin/log-absensi");
  revalidatePath("/admin");
  revalidatePath("/admin/rekap");
  revalidatePath("/karyawan/riwayat");
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

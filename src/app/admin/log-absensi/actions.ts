"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import {
  editAbsensiSkema,
  gabungCatatanEdit,
  hitungMenitTelatKoreksi,
  hitungSnapshotKoreksi,
  statusEfektif,
  type HasilAbsensi,
} from "@/lib/log-absensi";
import { wajibAkses } from "@/lib/session";
import { formatTanggal } from "@/lib/format";

export async function simpanEditAbsensi(formData: FormData): Promise<HasilAbsensi> {
  const admin = await wajibAkses("karyawan");
  const parsed = editAbsensiSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, pesan: parsed.error.issues[0].message };

  const absensi = await db.absensi.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { cabangId: true } } },
  });
  if (!absensi) return { ok: false, pesan: "Catatan absensi tidak ditemukan." };

  // Field tanggal tidak bisa diubah; tolak bila form tidak cocok dengan baris.
  if (parsed.data.tanggal !== absensi.tanggal) {
    return { ok: false, pesan: "Tanggal catatan berubah. Muat ulang halaman lalu coba lagi." };
  }

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

  const { masuk, keluar, status: statusForm, catatan } = parsed.data;
  const jumlahCycle = await db.absensiCycle.count({ where: { absensiId: absensi.id } });
  const masukAkhir = jumlahCycle > 1 ? absensi.masukMenit : masuk;
  const keluarAkhir = jumlahCycle > 1 ? absensi.keluarMenit : keluar;
  const menitTelat = hitungMenitTelatKoreksi(
    statusForm,
    masukAkhir,
    jadwal?.shift ?? null,
  );
  const snapshot = hitungSnapshotKoreksi(
    statusForm,
    masukAkhir,
    jadwal?.shift ?? null,
    absensi.modeShift,
  );
  // Hindari baris "telat 0 menit": status yang tidak terbukti telat
  // diluruskan menjadi hadir. Arah sebaliknya (hadir yang lewat toleransi)
  // tetap 0 sebagai pembolehan manual.
  const status = statusEfektif(statusForm, masukAkhir, jadwal?.shift ?? null);
  await db.absensi.update({
    where: { id: parsed.data.id },
    data: {
      status,
      masukMenit: masukAkhir,
      keluarMenit: keluarAkhir,
      menitTelat,
      menitToleransi: snapshot.menitToleransi,
      menitKotor: snapshot.menitKotor,
      catatan: gabungCatatanEdit(catatan),
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
    select: {
      id: true,
      userId: true,
      tanggal: true,
      status: true,
      masukMenit: true,
      keluarMenit: true,
      menitTelat: true,
      user: { select: { name: true } },
    },
  });
  if (!absensi) return { ok: false, pesan: "Catatan tidak ditemukan." };

  // Audit dulu, baru hapus, dalam satu transaksi: baris tetap terhapus
  // (karyawan bisa absen lagi di tanggal itu seperti perilaku lama),
  // tetapi ringkasannya tersimpan dan bisa dibaca di halaman Log Absensi.
  await db.$transaction([
    db.auditLog.create({
      data: {
        aksi: "hapus_absensi",
        targetUserId: absensi.userId,
        tanggal: absensi.tanggal,
        ringkasan: `${absensi.user.name} · ${formatTanggal(absensi.tanggal)} · status ${absensi.status} · masuk ${absensi.masukMenit ?? "—"} · keluar ${absensi.keluarMenit ?? "—"} · telat ${absensi.menitTelat} menit`,
        dilakukanOleh: admin.id,
      },
    }),
    db.absensi.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/log-absensi");
  revalidatePath("/admin");
  revalidatePath("/admin/rekap");
  revalidatePath("/karyawan/riwayat");

  return {
    ok: true,
    pesan: `Catatan ${formatTanggal(absensi.tanggal)} dihapus. Pengguna dapat absen lagi.`,
  };
}

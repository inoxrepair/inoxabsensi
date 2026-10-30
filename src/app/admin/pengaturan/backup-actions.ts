"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { backupJadwalSkema, kelompokTanggalRestore } from "@/lib/backup-jadwal";
import { wajibAkses } from "@/lib/session";

export type HasilBackup = { ok: boolean; pesan: string };

export type RingkasanRestore = {
  ok: boolean;
  pesan: string;
  karyawan: number;
  dari: string;
  sampai: string;
  jumlahHari: number;
  barisDihapus: number;
  barisDibuat: number;
};

/** Parse + resolusi backup tanpa menulis; dipakai preview dan eksekusi. */
async function resolusiBackup(
  formData: FormData,
): Promise<
  | { ok: false; pesan: string }
  | {
      ok: true;
      data: {
        userId: string;
        tanggal: string;
        shiftId: string;
        seragamId: string | null;
        seragam: string | null;
      }[];
    }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, pesan: "Pilih file backup JSON." };
  }
  if (file.size > 10_000_000) {
    return { ok: false, pesan: "File backup maksimal 10 MB." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { ok: false, pesan: "File bukan JSON yang valid." };
  }
  const parsed = backupJadwalSkema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, pesan: `Backup tidak valid: ${parsed.error.issues[0].message}` };
  }
  const [users, shifts, seragam] = await Promise.all([
    db.user.findMany({ select: { id: true, username: true, email: true } }),
    db.shift.findMany({ select: { id: true, nama: true } }),
    db.jenisSeragam.findMany({ select: { id: true, kode: true, nama: true } }),
  ]);
  const byUsername = new Map(users.flatMap((u) => (u.username ? [[u.username, u] as const] : [])));
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const byShift = new Map(shifts.map((s) => [s.nama.toLowerCase(), s]));
  const bySeragam = new Map(seragam.map((s) => [s.kode.toUpperCase(), s]));
  const data: {
    userId: string;
    tanggal: string;
    shiftId: string;
    seragamId: string | null;
    seragam: string | null;
  }[] = [];
  for (const row of parsed.data.data) {
    const user =
      (row.username ? byUsername.get(row.username) : undefined) ??
      byEmail.get(row.email.toLowerCase());
    if (!user) return { ok: false, pesan: `Akun ${row.email} tidak ditemukan.` };
    const shift = byShift.get(row.shift.toLowerCase());
    if (!shift) return { ok: false, pesan: `Shift ${row.shift} tidak ditemukan.` };
    const uniform = row.seragamKode ? bySeragam.get(row.seragamKode.toUpperCase()) : undefined;
    if (row.seragamKode && !uniform) {
      return { ok: false, pesan: `Seragam ${row.seragamKode} tidak ditemukan.` };
    }
    data.push({
      userId: user.id,
      tanggal: row.tanggal,
      shiftId: shift.id,
      seragamId: uniform?.id ?? null,
      seragam: uniform?.nama ?? null,
    });
  }
  return { ok: true, data };
}

export async function previewRestoreBackup(
  formData: FormData,
): Promise<RingkasanRestore> {
  const gagal = (pesan: string): RingkasanRestore => ({
    ok: false,
    pesan,
    karyawan: 0,
    dari: "",
    sampai: "",
    jumlahHari: 0,
    barisDihapus: 0,
    barisDibuat: 0,
  });
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") {
    return gagal("Hanya Super Admin dapat restore backup.");
  }
  const hasil = await resolusiBackup(formData);
  if (!hasil.ok) return gagal(hasil.pesan);
  const kelompok = kelompokTanggalRestore(hasil.data);
  const lama = await db.jadwal.count({
    where: {
      OR: kelompok.map(({ userId, tanggal }) => ({
        userId,
        tanggal: { in: tanggal },
      })),
    },
  });
  const tanggal = [...new Set(hasil.data.map((d) => d.tanggal))].sort();
  return {
    ok: true,
    pesan: "Preview siap.",
    karyawan: new Set(hasil.data.map((d) => d.userId)).size,
    dari: tanggal[0] ?? "",
    sampai: tanggal[tanggal.length - 1] ?? "",
    jumlahHari: tanggal.length,
    barisDihapus: lama,
    barisDibuat: hasil.data.length,
  };
}

export async function importBackupJadwal(formData: FormData): Promise<HasilBackup> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya Super Admin dapat restore backup." };
  }
  const hasil = await resolusiBackup(formData);
  if (!hasil.ok) return { ok: false, pesan: hasil.pesan };
  const data = hasil.data;

  const kelompok = kelompokTanggalRestore(data);
  const operasi = [
    ...kelompok.map(({ userId, tanggal }) =>
      db.jadwal.deleteMany({ where: { userId, tanggal: { in: tanggal } } }),
    ),
    ...(data.length ? [db.jadwal.createMany({ data })] : []),
  ];
  if (operasi.length) await db.$transaction(operasi);
  revalidatePath("/admin/jadwal");
  revalidatePath("/karyawan/jadwal");
  return { ok: true, pesan: `${data.length} jadwal berhasil dipulihkan dari backup.` };
}

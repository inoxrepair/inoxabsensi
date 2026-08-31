"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { backupJadwalSkema } from "@/lib/backup-jadwal";
import { wajibAkses } from "@/lib/session";

export type HasilBackup = { ok: boolean; pesan: string };

export async function importBackupJadwal(formData: FormData): Promise<HasilBackup> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya Super Admin dapat restore backup." };
  }
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
  const userIds: string[] = [];
  const dates: string[] = [];
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
    userIds.push(user.id);
    dates.push(row.tanggal);
    data.push({
      userId: user.id,
      tanggal: row.tanggal,
      shiftId: shift.id,
      seragamId: uniform?.id ?? null,
      seragam: uniform?.nama ?? null,
    });
  }

  const ids = [...new Set(userIds)];
  const tanggal = [...new Set(dates)];
  await db.$transaction([
    db.jadwal.deleteMany({ where: { userId: { in: ids }, tanggal: { in: tanggal } } }),
    ...(data.length ? [db.jadwal.createMany({ data })] : []),
  ]);
  revalidatePath("/admin/jadwal");
  revalidatePath("/karyawan/jadwal");
  return { ok: true, pesan: `${data.length} jadwal berhasil dipulihkan dari backup.` };
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { wajibAkses, type Pengguna } from "@/lib/session";
import { selJadwalSkema, shiftSkema } from "@/lib/jadwal";
import { selisihHari, tanggalGeser } from "@/lib/waktu";
import { tanggalValid } from "@/lib/rekap";
import { parseCsv, shiftByKode } from "@/lib/spreadsheet";

export type Hasil = { ok: boolean; pesan: string };

function segarkan() {
  revalidatePath("/admin/jadwal");
  // Jadwal menentukan shift pada halaman absen & jadwal karyawan.
  revalidatePath("/karyawan");
  revalidatePath("/karyawan/jadwal");
}

/**
 * Admin cabang hanya boleh menyentuh karyawan di cabangnya sendiri.
 * Dicek di server karena daftar karyawan di klien bisa dimanipulasi.
 */
async function pastikanDalamLingkup(
  admin: Pengguna,
  userId: string,
): Promise<boolean> {
  if (admin.role === "super_admin") return true;
  if (!admin.cabangId) return false;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { cabangId: true },
  });
  return target?.cabangId === admin.cabangId;
}

/* -------------------------------------------------------------------------- */
/* Definisi shift                                                             */
/* -------------------------------------------------------------------------- */

export async function simpanShift(
  id: string | null,
  formData: FormData,
): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");
  // Definisi shift berlaku global, jadi dibatasi super admin.
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat mengubah shift." };
  }

  const parsed = shiftSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    if (id) await db.shift.update({ where: { id }, data });
    else await db.shift.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, pesan: `Shift bernama "${data.nama}" sudah ada.` };
    }
    throw e;
  }

  segarkan();
  return { ok: true, pesan: id ? "Shift diperbarui." : `Shift ${data.nama} dibuat.` };
}

export async function hapusShift(id: string): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat menghapus shift." };
  }

  // Shift yang sudah dipakai tidak dihapus: relasi Jadwal akan jadi null
  // dan riwayat penjadwalan hilang tanpa jejak.
  const dipakai = await db.jadwal.count({ where: { shiftId: id } });
  if (dipakai > 0) {
    return {
      ok: false,
      pesan: `Shift dipakai pada ${dipakai} hari jadwal. Kosongkan dulu jadwalnya.`,
    };
  }

  await db.shift.delete({ where: { id } });
  segarkan();
  return { ok: true, pesan: "Shift dihapus." };
}

/* -------------------------------------------------------------------------- */
/* Matriks jadwal                                                             */
/* -------------------------------------------------------------------------- */

/** Set satu sel: pilih shift, atau kosongkan berarti libur. */
export async function setJadwal(formData: FormData): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");

  const parsed = selJadwalSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const { userId, tanggal, shiftId, seragamId } = parsed.data;

  if (!(await pastikanDalamLingkup(admin, userId))) {
    return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
  }

  if (shiftId) {
    // Pastikan shift benar-benar ada sebelum menulis relasi.
    const ada = await db.shift.count({ where: { id: shiftId } });
    if (ada === 0) return { ok: false, pesan: "Shift tidak ditemukan." };
  }

  const seragam = seragamId
    ? await db.jenisSeragam.findUnique({
        where: { id: seragamId },
        select: { id: true, nama: true },
      })
    : null;
  if (seragamId && !seragam) return { ok: false, pesan: "Jenis seragam tidak ditemukan." };

  if (shiftId === null) {
    // Libur: hapus barisnya, bukan simpan baris kosong, agar tabel
    // hanya memuat hari kerja yang benar-benar dijadwalkan.
    await db.jadwal.deleteMany({ where: { userId, tanggal } });
  } else {
    await db.jadwal.upsert({
      where: { userId_tanggal: { userId, tanggal } },
      update: { shiftId, seragamId: seragam?.id ?? null, seragam: seragam?.nama ?? null },
      create: { userId, tanggal, shiftId, seragamId: seragam?.id ?? null, seragam: seragam?.nama ?? null },
    });
  }

  segarkan();
  return { ok: true, pesan: shiftId ? "Jadwal disimpan." : "Ditandai libur." };
}

/**
 * Salin pola satu minggu ke minggu berikutnya. Jadwal ritel biasanya berulang,
 * jadi ini menghemat 7×N klik dibanding mengisi manual.
 */
export async function salinMinggu(
  dariSenin: string,
  keSenin: string,
): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");

  const asal = Array.from({ length: 7 }, (_, i) => tanggalGeser(dariSenin, i));
  const tujuan = Array.from({ length: 7 }, (_, i) => tanggalGeser(keSenin, i));

  const lingkup =
    roleTerbatasCabang(admin.role)
      ? { user: { cabangId: admin.cabangId ?? "-" } }
      : {};

  const sumber = await db.jadwal.findMany({
    where: { tanggal: { in: asal }, ...lingkup },
    select: { userId: true, tanggal: true, shiftId: true, seragamId: true, seragam: true },
  });

  if (sumber.length === 0) {
    return { ok: false, pesan: "Minggu sumber belum punya jadwal." };
  }

  const baris = sumber
    .filter((s) => s.shiftId !== null)
    .map((s) => ({
      userId: s.userId,
      tanggal: tujuan[asal.indexOf(s.tanggal)],
      shiftId: s.shiftId,
      seragamId: s.seragamId,
      seragam: s.seragam,
    }));

  // Transaksi: minggu tujuan digantikan seluruhnya, bukan digabung,
  // supaya hasilnya persis sama dengan minggu sumber.
  await db.$transaction([
    db.jadwal.deleteMany({ where: { tanggal: { in: tujuan }, ...lingkup } }),
    db.jadwal.createMany({ data: baris }),
  ]);

  segarkan();
  return { ok: true, pesan: `${baris.length} hari jadwal disalin.` };
}

/** Kosongkan seluruh jadwal satu minggu dalam lingkup admin. */
export async function kosongkanMinggu(senin: string): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");

  const minggu = Array.from({ length: 7 }, (_, i) => tanggalGeser(senin, i));
  const lingkup =
    roleTerbatasCabang(admin.role)
      ? { user: { cabangId: admin.cabangId ?? "-" } }
      : {};

  const { count } = await db.jadwal.deleteMany({
    where: { tanggal: { in: minggu }, ...lingkup },
  });

  segarkan();
  return { ok: true, pesan: `${count} hari jadwal dikosongkan.` };
}

/** Tetapkan satu shift untuk beberapa karyawan pada rentang tanggal. */
export async function aturRentang(formData: FormData): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");
  const dariRaw = String(formData.get("dari") ?? "");
  const sampaiRaw = String(formData.get("sampai") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "") || null;
  const seragamId = String(formData.get("seragamId") ?? "") || null;
  const cabangIdForm = String(formData.get("cabangId") ?? "");
  const userIds = formData.getAll("userId").map(String).filter(Boolean);

  if (!tanggalValid(dariRaw) || !tanggalValid(sampaiRaw)) {
    return { ok: false, pesan: "Rentang tanggal tidak valid." };
  }
  const [dari, sampai] =
    dariRaw <= sampaiRaw ? [dariRaw, sampaiRaw] : [sampaiRaw, dariRaw];
  const jumlahHari = selisihHari(dari, sampai) + 1;
  if (jumlahHari > 62) {
    return { ok: false, pesan: "Rentang maksimal 62 hari sekali proses." };
  }

  if (shiftId && (await db.shift.count({ where: { id: shiftId } })) === 0) {
    return { ok: false, pesan: "Shift tidak ditemukan." };
  }
  const seragam = seragamId
    ? await db.jenisSeragam.findFirst({
        where: { id: seragamId, aktif: true },
        select: { id: true, nama: true },
      })
    : null;
  if (seragamId && !seragam) {
    return { ok: false, pesan: "Jenis seragam tidak aktif atau tidak ditemukan." };
  }

  const cabangId = roleTerbatasCabang(admin.role)
    ? admin.cabangId
    : cabangIdForm || null;
  if (roleTerbatasCabang(admin.role) && !cabangId) {
    return { ok: false, pesan: "Akun Anda belum ditempatkan di cabang." };
  }

  const target = await db.user.findMany({
    where: {
      id: { in: userIds },
      aktif: true,
      role: { not: "super_admin" },
      ...(cabangId ? { cabangId } : {}),
    },
    select: { id: true },
  });
  if (target.length === 0) {
    return { ok: false, pesan: "Pilih minimal satu karyawan dalam lingkup Anda." };
  }
  if (target.length !== new Set(userIds).size) {
    return { ok: false, pesan: "Sebagian karyawan di luar lingkup cabang Anda." };
  }

  const tanggal = Array.from({ length: jumlahHari }, (_, i) =>
    tanggalGeser(dari, i),
  );
  const ids = target.map((u) => u.id);
  const baris = ids.flatMap((userId) =>
    tanggal.map((tgl) => ({
      userId,
      tanggal: tgl,
      shiftId,
      seragamId: seragam?.id ?? null,
      seragam: seragam?.nama ?? null,
    })),
  );

  const operasi = [
    db.jadwal.deleteMany({
      where: { userId: { in: ids }, tanggal: { in: tanggal } },
    }),
    ...(shiftId ? [db.jadwal.createMany({ data: baris })] : []),
  ];
  await db.$transaction(operasi);

  segarkan();
  return {
    ok: true,
    pesan: shiftId
      ? `${baris.length} hari jadwal diterapkan.`
      : `${ids.length} karyawan ditandai libur selama ${jumlahHari} hari.`,
  };
}

/** Import CSV hasil export spreadsheet. */
export async function importJadwalCsv(formData: FormData): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, pesan: "Pilih file CSV." };
  }
  if (file.size > 2_000_000) return { ok: false, pesan: "File maksimal 2 MB." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2 || rows[0][0] !== "Karyawan" || rows[0][1] !== "Cabang") {
    return { ok: false, pesan: "Format CSV tidak sesuai hasil export Jadwal." };
  }
  const dates = rows[0].slice(2);
  if (dates.length === 0 || dates.length > 62 || dates.some((d) => !tanggalValid(d))) {
    return { ok: false, pesan: "Kolom tanggal CSV tidak valid." };
  }

  const cabangId = roleTerbatasCabang(admin.role) ? admin.cabangId : String(formData.get("cabangId") ?? "") || null;
  const lingkup = cabangId ? { cabangId } : {};
  const [users, shifts] = await Promise.all([
    db.user.findMany({ where: { aktif: true, role: { not: "super_admin" }, ...lingkup }, select: { id: true, name: true } }),
    db.shift.findMany({ orderBy: { mulaiMenit: "asc" } }),
  ]);
  const byName = new Map<string, (typeof users)[number]>();
  for (const user of users) {
    const key = user.name.trim().toLowerCase();
    if (byName.has(key)) {
      return { ok: false, pesan: `Nama karyawan "${user.name}" duplikat. Import tidak aman; ubah nama akun lebih spesifik.` };
    }
    byName.set(key, user);
  }
  const userIds: string[] = [];
  const creates: { userId: string; tanggal: string; shiftId: string; seragam: null; seragamId: null }[] = [];

  for (const row of rows.slice(1)) {
    const user = byName.get((row[0] ?? "").trim().toLowerCase());
    if (!user) return { ok: false, pesan: `Karyawan "${row[0] ?? ""}" tidak ditemukan pada lingkup ini.` };
    userIds.push(user.id);
    for (let i = 0; i < dates.length; i++) {
      const kode = (row[i + 2] ?? "L").trim().toUpperCase();
      if (!kode || kode === "L" || kode === "-") continue;
      const shift = shiftByKode(kode, shifts.map((s) => ({ id: s.id, nama: s.nama, mulai: "", selesai: "" })));
      if (!shift) return { ok: false, pesan: `Kode shift "${kode}" tidak dikenal. Gunakan P/S/F/L.` };
      if (shift) creates.push({ userId: user.id, tanggal: dates[i], shiftId: shift.id, seragam: null, seragamId: null });
    }
  }
  const ids = [...new Set(userIds)];
  await db.$transaction([
    db.jadwal.deleteMany({ where: { userId: { in: ids }, tanggal: { in: dates } } }),
    ...(creates.length ? [db.jadwal.createMany({ data: creates })] : []),
  ]);
  segarkan();
  return { ok: true, pesan: `${creates.length} jadwal berhasil diimport.` };
}

/** Salin pola 7 hari yang sedang dipilih ke seluruh bulan. */
export async function generateJadwalBulanan(formData: FormData): Promise<Hasil> {
  const admin = await wajibAkses("jadwal");
  const bulan = String(formData.get("bulan") ?? "");
  const polaMulai = String(formData.get("polaMulai") ?? "");
  const cabangIdForm = String(formData.get("cabangId") ?? "");
  if (!/^\d{4}-\d{2}$/.test(bulan) || !tanggalValid(polaMulai)) {
    return { ok: false, pesan: "Bulan atau tanggal pola tidak valid." };
  }
  const cabangId = roleTerbatasCabang(admin.role) ? admin.cabangId : cabangIdForm || null;
  const lingkup = cabangId ? { user: { cabangId } } : {};
  const polaDates = Array.from({ length: 7 }, (_, i) => tanggalGeser(polaMulai, i));
  const pola = await db.jadwal.findMany({
    where: { tanggal: { in: polaDates }, ...lingkup },
    select: { userId: true, tanggal: true, shiftId: true, seragamId: true, seragam: true },
  });
  if (!pola.length) return { ok: false, pesan: "Minggu pola belum memiliki jadwal." };
  const [year, month] = bulan.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates = Array.from({ length: count }, (_, i) => `${bulan}-${String(i + 1).padStart(2, "0")}`);
  const users = [...new Set(pola.map((p) => p.userId))];
  const byUserDay = new Map(pola.map((p) => [`${p.userId}|${polaDates.indexOf(p.tanggal)}`, p]));
  const data = users.flatMap((userId) => dates.flatMap((date) => {
    const idx = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
    const p = byUserDay.get(`${userId}|${idx}`);
    return p?.shiftId ? [{ userId, tanggal: date, shiftId: p.shiftId, seragamId: p.seragamId, seragam: p.seragam }] : [];
  }));
  await db.$transaction([
    db.jadwal.deleteMany({ where: { userId: { in: users }, tanggal: { in: dates } } }),
    db.jadwal.createMany({ data }),
  ]);
  segarkan();
  return { ok: true, pesan: `${data.length} jadwal bulan ${bulan} dibuat dari pola mingguan.` };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibLogin } from "@/lib/session";
import {
  bolehKeluar,
  bolehMasuk,
  kekuranganKerja,
  type KondisiAbsen,
} from "@/lib/absensi";
import { bacaStatusAbsensi } from "@/lib/domain";
import { menitLokal, tanggalLokal } from "@/lib/waktu";

/** Koordinat dari browser; rentang divalidasi agar tidak menyimpan sampah. */
const posisiSkema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type HasilAbsen = { ok: boolean; pesan: string };

/** Kumpulkan kondisi hari ini: penempatan cabang, shift, dan absensi tercatat. */
async function kondisiHariIni(userId: string, tanggal: string) {
  const [user, jadwal, absensi] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { cabang: true },
    }),
    db.jadwal.findUnique({
      where: { userId_tanggal: { userId, tanggal } },
      select: {
        shift: true,
        seragam: true,
        jenisSeragam: { select: { nama: true } },
      },
    }),
    db.absensi.findUnique({
      where: { userId_tanggal: { userId, tanggal } },
    }),
  ]);

  const kondisi: KondisiAbsen = {
    shift: jadwal?.shift ?? null,
    cabang: user.cabang,
    posisi: null,
    masukMenit: absensi?.masukMenit ?? null,
    keluarMenit: absensi?.keluarMenit ?? null,
    statusTercatat: absensi ? bacaStatusAbsensi(absensi.status) : null,
  };

  return {
    kondisi,
    cabangId: user.cabang?.id ?? null,
    adaBaris: absensi !== null,
    seragam: jadwal?.jenisSeragam?.nama ?? jadwal?.seragam,
    minimumKerjaMenit:
      absensi?.minimumKerjaMenit ?? jadwal?.shift?.minimumKerjaMenit ?? null,
  };
}

export async function absenMasuk(formData: FormData): Promise<HasilAbsen> {
  const user = await wajibLogin();
  const posisi = posisiSkema.safeParse(Object.fromEntries(formData));
  if (!posisi.success) {
    return { ok: false, pesan: "Koordinat lokasi tidak valid." };
  }

  const tanggal = tanggalLokal();
  const sekarang = menitLokal();
  const { kondisi, cabangId, adaBaris } = await kondisiHariIni(user.id, tanggal);

  const izin = bolehMasuk({ ...kondisi, posisi: posisi.data }, sekarang);
  if (!izin.ok) return { ok: false, pesan: izin.alasan };

  const catatan = {
    status: izin.status,
    masukMenit: sekarang,
    // Disimpan agar rekap tidak perlu menghitung ulang dari shift, yang
    // jamnya bisa diubah admin setelah absensi tercatat.
    menitTelat: izin.menitTelat,
    modeShift: kondisi.shift?.mode ?? "terjadwal",
    minimumKerjaMenit: kondisi.shift?.minimumKerjaMenit ?? null,
    kekuranganMenit: 0,
    masukLat: posisi.data.lat,
    masukLng: posisi.data.lng,
    masukJarakMeter: izin.jarakMeter,
  };

  // Baris bisa sudah ada (mis. ditandai alpa oleh proses harian), jadi
  // upsert dipakai agar tidak menabrak unique constraint userId+tanggal.
  // cabangId dijamin ada: bolehMasuk menolak bila cabang null.
  if (adaBaris) {
    await db.absensi.update({
      where: { userId_tanggal: { userId: user.id, tanggal } },
      data: catatan,
    });
  } else {
    await db.absensi.create({
      data: { userId: user.id, cabangId: cabangId!, tanggal, ...catatan },
    });
  }

  revalidatePath("/karyawan");
  revalidatePath("/karyawan/riwayat");

  return {
    ok: true,
    pesan:
      izin.status === "telat"
        ? `Absen masuk tercatat, terlambat ${izin.menitTelat} menit.`
        : "Absen masuk tercatat. Selamat bekerja.",
  };
}

export async function absenKeluar(formData: FormData): Promise<HasilAbsen> {
  const user = await wajibLogin();
  const posisi = posisiSkema.safeParse(Object.fromEntries(formData));
  if (!posisi.success) {
    return { ok: false, pesan: "Koordinat lokasi tidak valid." };
  }

  const tanggal = tanggalLokal();
  const sekarang = menitLokal();
  const { kondisi, minimumKerjaMenit } = await kondisiHariIni(user.id, tanggal);

  const izin = bolehKeluar({ ...kondisi, posisi: posisi.data }, sekarang);
  if (!izin.ok) return { ok: false, pesan: izin.alasan };

  await db.absensi.update({
    where: { userId_tanggal: { userId: user.id, tanggal } },
    data: {
      keluarMenit: sekarang,
      keluarLat: posisi.data.lat,
      keluarLng: posisi.data.lng,
      keluarJarakMeter: izin.jarakMeter,
      kekuranganMenit: kekuranganKerja(
        izin.durasiMenit,
        minimumKerjaMenit,
      ),
    },
  });

  revalidatePath("/karyawan");
  revalidatePath("/karyawan/riwayat");

  const jam = Math.floor(izin.durasiMenit / 60);
  const menit = izin.durasiMenit % 60;
  return {
    ok: true,
    pesan: `Absen keluar tercatat. Durasi kerja ${jam}j${menit ? ` ${menit}m` : ""}.${
      minimumKerjaMenit != null &&
      kekuranganKerja(izin.durasiMenit, minimumKerjaMenit) > 0
        ? ` Kurang ${kekuranganKerja(izin.durasiMenit, minimumKerjaMenit)} menit dari target.`
        : ""
    }`,
  };
}

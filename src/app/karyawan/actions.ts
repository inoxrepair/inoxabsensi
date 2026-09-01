"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibLogin } from "@/lib/session";
import {
  bolehKeluar,
  bolehMasuk,
  kekuranganKerja,
  ringkasCycle,
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
      include: { cycles: { orderBy: { urutan: "asc" } } },
    }),
  ]);

  const cycles = absensi?.cycles.length
    ? absensi.cycles
    : absensi?.masukMenit != null
      ? [{
          id: "legacy",
          absensiId: absensi.id,
          urutan: 1,
          masukMenit: absensi.masukMenit,
          keluarMenit: absensi.keluarMenit,
          masukLat: absensi.masukLat,
          masukLng: absensi.masukLng,
          masukJarakMeter: absensi.masukJarakMeter,
          keluarLat: absensi.keluarLat,
          keluarLng: absensi.keluarLng,
          keluarJarakMeter: absensi.keluarJarakMeter,
        }]
      : [];
  const terakhir = cycles.at(-1) ?? null;
  const maksimalCycle = absensi?.maksimalCycle ?? jadwal?.shift?.maksimalCycle ?? 1;
  const kondisi: KondisiAbsen = {
    shift: jadwal?.shift ?? null,
    cabang: user.cabang,
    posisi: null,
    masukMenit: terakhir?.masukMenit ?? null,
    keluarMenit: terakhir?.keluarMenit ?? null,
    statusTercatat: absensi ? bacaStatusAbsensi(absensi.status) : null,
    jumlahCycle: cycles.length,
    maksimalCycle,
  };

  return {
    kondisi,
    cabangId: user.cabang?.id ?? null,
    adaBaris: absensi !== null,
    absensiId: absensi?.id ?? null,
    cycles,
    maksimalCycle,
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
  const { kondisi, cabangId, adaBaris, absensiId, cycles, maksimalCycle } = await kondisiHariIni(user.id, tanggal);

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
    maksimalCycle,
    kekuranganMenit: 0,
    masukLat: posisi.data.lat,
    masukLng: posisi.data.lng,
    masukJarakMeter: izin.jarakMeter,
  };

  // Baris bisa sudah ada (mis. ditandai alpa oleh proses harian), jadi
  // upsert dipakai agar tidak menabrak unique constraint userId+tanggal.
  // cabangId dijamin ada: bolehMasuk menolak bila cabang null.
  const urutan = cycles.length + 1;
  try {
    await db.$transaction(async (tx) => {
      let id = absensiId;
      if (adaBaris && id) {
        // Database lokal lama yang dibuat lewat db push belum menjalankan
        // backfill SQL, jadi materialisasikan cycle pertama saat diperlukan.
        if (cycles[0]?.id === "legacy") {
          await tx.absensiCycle.create({
            data: { ...cycles[0], id: undefined, absensiId: id },
          });
        }
        await tx.absensi.update({
          where: { id },
          data: { ...catatan, keluarMenit: null, keluarLat: null, keluarLng: null, keluarJarakMeter: null },
        });
      } else {
        const dibuat = await tx.absensi.create({
          data: { userId: user.id, cabangId: cabangId!, tanggal, ...catatan },
          select: { id: true },
        });
        id = dibuat.id;
      }
      await tx.absensiCycle.create({
        data: {
          absensiId: id!,
          urutan,
          masukMenit: sekarang,
          masukLat: posisi.data.lat,
          masukLng: posisi.data.lng,
          masukJarakMeter: izin.jarakMeter,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, pesan: "Absensi sudah berubah. Muat ulang halaman lalu coba lagi." };
    }
    throw error;
  }

  revalidatePath("/karyawan");
  revalidatePath("/karyawan/riwayat");

  return {
    ok: true,
    pesan:
      izin.status === "telat"
        ? `Absen masuk cycle ${urutan} tercatat, terlambat ${izin.menitTelat} menit.`
        : `Absen masuk cycle ${urutan} dari ${maksimalCycle} tercatat. Selamat bekerja.`,
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
  const { kondisi, minimumKerjaMenit, absensiId, cycles, maksimalCycle } = await kondisiHariIni(user.id, tanggal);

  const izin = bolehKeluar({ ...kondisi, posisi: posisi.data }, sekarang);
  if (!izin.ok) return { ok: false, pesan: izin.alasan };

  const terakhir = cycles.at(-1)!;
  const cyclesSelesai = cycles.map((cycle, index) =>
    index === cycles.length - 1 ? { ...cycle, keluarMenit: sekarang } : cycle,
  );
  const totalMenit = ringkasCycle(cyclesSelesai).totalMenit;
  const disimpan = await db.$transaction(async (tx) => {
    if (terakhir.id === "legacy") {
      await tx.absensiCycle.create({
        data: {
          absensiId: absensiId!,
          urutan: 1,
          masukMenit: terakhir.masukMenit,
          keluarMenit: sekarang,
          masukLat: terakhir.masukLat,
          masukLng: terakhir.masukLng,
          masukJarakMeter: terakhir.masukJarakMeter,
          keluarLat: posisi.data.lat,
          keluarLng: posisi.data.lng,
          keluarJarakMeter: izin.jarakMeter,
        },
      });
    } else {
      const diubah = await tx.absensiCycle.updateMany({
        where: { id: terakhir.id, keluarMenit: null },
        data: {
          keluarMenit: sekarang,
          keluarLat: posisi.data.lat,
          keluarLng: posisi.data.lng,
          keluarJarakMeter: izin.jarakMeter,
        },
      });
      if (diubah.count !== 1) throw new Error("CYCLE_SUDAH_KELUAR");
    }
    await tx.absensi.update({
      where: { id: absensiId! },
      data: {
        keluarMenit: sekarang,
        keluarLat: posisi.data.lat,
        keluarLng: posisi.data.lng,
        keluarJarakMeter: izin.jarakMeter,
        kekuranganMenit: kekuranganKerja(totalMenit, minimumKerjaMenit),
      },
    });
    return true;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CYCLE_SUDAH_KELUAR") return false;
    throw error;
  });
  if (!disimpan) {
    return { ok: false, pesan: "Cycle ini sudah diakhiri. Muat ulang halaman untuk melihat data terbaru." };
  }

  revalidatePath("/karyawan");
  revalidatePath("/karyawan/riwayat");

  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  const urutan = cycles.length;
  return {
    ok: true,
    pesan: `Absen keluar cycle ${urutan} tercatat. Total kerja ${jam}j${menit ? ` ${menit}m` : ""}.${
      minimumKerjaMenit != null &&
      kekuranganKerja(totalMenit, minimumKerjaMenit) > 0
        ? ` Kurang ${kekuranganKerja(totalMenit, minimumKerjaMenit)} menit dari target.`
        : ""
    }${urutan < maksimalCycle ? ` Anda masih dapat memulai ${maksimalCycle - urutan} cycle lagi.` : " Batas cycle hari ini tercapai."}`,
  };
}

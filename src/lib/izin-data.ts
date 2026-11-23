import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { roleTerbatasCabang, type RoleKaryawan } from "@/lib/domain";

/**
 * Akses data pengajuan izin yang menyentuh kolom/tabel baru.
 *
 * Kolom jamMasukDiizinkan / jamPulangDiizinkan / buktiFoto dan tabel
 * IzinDibaca lahir setelah client Prisma di node_modules di-generate,
 * jadi diakses lewat SQL mentah — pola yang sama dengan kolom
 * dapatTunjanganMakan (lihat src/lib/karyawan.ts). Saat deploy,
 * `prisma generate` dijalankan ulang dan akses ini tetap benar.
 */

/** Kolom tambahan pengajuan untuk sejumlah id (digabung ke hasil findMany). */
export type KolomTambahanIzin = {
  jamMasukDiizinkan: number | null;
  jamPulangDiizinkan: number | null;
  buktiFoto: string | null;
};

export async function ambilKolomTambahanIzin(
  ids: string[],
): Promise<Map<string, KolomTambahanIzin>> {
  if (ids.length === 0) return new Map();
  try {
    const rows = await db.$queryRaw<
      {
        id: string;
        jamMasukDiizinkan: number | null;
        jamPulangDiizinkan: number | null;
        buktiFoto: string | null;
      }[]
    >`
      SELECT "id", "jamMasukDiizinkan", "jamPulangDiizinkan", "buktiFoto"
      FROM "PengajuanIzin"
      WHERE "id" IN (${Prisma.join(ids)})
    `;
    return new Map(
      rows.map((r) => [
        r.id,
        {
          jamMasukDiizinkan: r.jamMasukDiizinkan,
          jamPulangDiizinkan: r.jamPulangDiizinkan,
          buktiFoto: r.buktiFoto,
        },
      ]),
    );
  } catch (error) {
    // Kolom belum ada (migrasi belum jalan): halaman tetap tampil tanpa
    // jam/foto.
    console.error("[izin] ambilKolomTambahanIzin gagal:", error);
    return new Map();
  }
}

/**
 * Tulis kolom jam/foto setelah pengajuan dibuat lewat Prisma (client lama
 * belum mengenal kolom ini). Hanya dipanggil untuk baris baru, jadi
 * menimpa ketiga kolom dengan nilai yang diberikan (null bila tidak ada).
 * Mengembalikan false bila gagal (mis. migrasi belum jalan) — pemanggil
 * yang memutuskan (pengajuan tanpa jam harus dibatalkan, bukan dibiarkan).
 */
export async function simpanKolomTambahanIzin(
  id: string,
  data: {
    jamMasukDiizinkan?: number | null;
    jamPulangDiizinkan?: number | null;
    buktiFoto?: string | null;
  },
): Promise<boolean> {
  try {
    await db.$executeRaw`
      UPDATE "PengajuanIzin"
      SET "jamMasukDiizinkan" = ${data.jamMasukDiizinkan ?? null},
          "jamPulangDiizinkan" = ${data.jamPulangDiizinkan ?? null},
          "buktiFoto" = ${data.buktiFoto ?? null}
      WHERE "id" = ${id}
    `;
    return true;
  } catch (error) {
    console.error("[izin] simpanKolomTambahanIzin gagal:", error);
    return false;
  }
}

/** Batas masuk yang diizinkan hari ini dari izin telat yang disetujui. */
export async function ambilIzinTelatDisetujui(
  userId: string,
  tanggal: string,
): Promise<number | null> {
  try {
    const rows = await db.$queryRaw<{ jam: number | null }[]>`
      SELECT "jamMasukDiizinkan" AS "jam"
      FROM "PengajuanIzin"
      WHERE "userId" = ${userId}
        AND "dari" = ${tanggal}
        AND "jenis" = 'telat'
        AND "status" = 'disetujui'
      LIMIT 1
    `;
    return rows[0]?.jam ?? null;
  } catch (error) {
    // Kolom belum ada (migrasi belum jalan): check-in jalan normal tanpa
    // izin telat — absen tidak boleh mati gara-gara ini.
    console.error("[izin] ambilIzinTelatDisetujui gagal:", error);
    return null;
  }
}

/** Batas pulang yang diizinkan hari ini dari izin pulang cepat yang disetujui. */
export async function ambilIzinPulangCepatDisetujui(
  userId: string,
  tanggal: string,
): Promise<number | null> {
  try {
    const rows = await db.$queryRaw<{ jam: number | null }[]>`
      SELECT "jamPulangDiizinkan" AS "jam"
      FROM "PengajuanIzin"
      WHERE "userId" = ${userId}
        AND "dari" = ${tanggal}
        AND "jenis" = 'pulang-cepat'
        AND "status" = 'disetujui'
      LIMIT 1
    `;
    return rows[0]?.jam ?? null;
  } catch (error) {
    console.error("[izin] ambilIzinPulangCepatDisetujui gagal:", error);
    return null;
  }
}

/** Jumlah pengajuan pending dalam lingkup admin (untuk lencana menu Izin). */
export async function hitungPengajuanIzinPending(admin: {
  role: RoleKaryawan;
  cabangId: string | null;
}): Promise<number> {
  try {
    const lingkup =
      roleTerbatasCabang(admin.role) && admin.cabangId
        ? { cabangId: admin.cabangId }
        : {};
    return await db.pengajuanIzin.count({
      where: { status: "pending", user: { aktif: true, ...lingkup } },
    });
  } catch (error) {
    console.error("[izin] hitungPengajuanIzinPending gagal:", error);
    return 0;
  }
}

/**
 * Jumlah pengajuan karyawan yang sudah diproses admin sejak terakhir ia
 * membuka halaman izin. Tanpa baris IzinDibaca, semua yang diproses
 * dihitung belum dibaca. Tidak pernah melempar — lencana cukup hilang
 * bila tabel bermasalah (sebelum migrasi jalan).
 */
export async function hitungIzinDiproses(userId: string): Promise<number> {
  try {
    const rows = await db.$queryRaw<{ jumlah: bigint }[]>`
      SELECT COUNT(*) AS "jumlah"
      FROM "PengajuanIzin" p
      LEFT JOIN "IzinDibaca" d ON d."userId" = ${userId}
      WHERE p."userId" = ${userId}
        AND p."status" IN ('disetujui', 'ditolak')
        AND (d."dibacaPada" IS NULL OR p."updatedAt" > d."dibacaPada")
    `;
    return Number(rows[0]?.jumlah ?? 0);
  } catch (error) {
    console.error("[izin] hitungIzinDiproses gagal:", error);
    return 0;
  }
}

/** Tandai halaman izin sudah dibuka (saat membuka halaman izin). */
export async function tandaiIzinDibaca(userId: string): Promise<void> {
  try {
    await db.$executeRaw`
      INSERT INTO "IzinDibaca" ("userId", "dibacaPada")
      VALUES (${userId}, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET "dibacaPada" = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error("[izin] tandaiIzinDibaca gagal:", error);
  }
}

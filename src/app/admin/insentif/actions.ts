"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  ambilInsentifRentang,
  jalankanSinkronInsentif,
  normalisasiNama,
  type RingkasanInsentifDenganUser,
} from "@/lib/insentif";
import { wajibAkses } from "@/lib/session";
import { periodeValid, tanggalValid } from "@/lib/rekap";

export type HasilSinkronInsentif = {
  ok: boolean;
  pesan: string;
  detail?: any;
};

/**
 * Trigger sinkron insentif dari inox.my.id.
 * Memanggil jalankanSinkronInsentif langsung (bukan fetch ke API route),
 * karena cookie sesi tidak ikut terkirim pada fetch server-side dan
 * route akan menjawab 401. Rentang dari/sampai diambil dari filter
 * halaman (bila tidak diberikan, dipakai siklus gajian default).
 */
export async function sinkronInsentif(
  periode: string,
  dari?: string,
  sampai?: string,
): Promise<HasilSinkronInsentif> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super_admin dapat sinkron insentif." };
  }

  if (!periodeValid(periode)) {
    return { ok: false, pesan: "Periode tidak valid." };
  }

  try {
    const hasil = await jalankanSinkronInsentif(periode, dari, sampai);
    revalidatePath("/admin/insentif");
    return {
      ok: true,
      pesan: hasil.pesan,
      detail: hasil,
    };
  } catch (err: any) {
    return {
      ok: false,
      pesan: err?.message ?? "Sinkron gagal.",
    };
  }
}

/** Wrapper untuk <form action> — ambil periode dan rentang dari FormData, kembalikan hasil sinkron supaya halaman bisa menampilkannya. */
export async function sinkronInsentifForm(
  _prev: HasilSinkronInsentif | undefined,
  formData: FormData,
): Promise<HasilSinkronInsentif> {
  const periode = formData.get("periode") as string;
  const dari = (formData.get("dari") as string) || undefined;
  const sampai = (formData.get("sampai") as string) || undefined;
  return sinkronInsentif(periode, dari, sampai);
}

/** Baris insentif per karyawan untuk satu rentang tanggal (nama + cabang). */
export type BarisInsentifAdmin = RingkasanInsentifDenganUser;

/**
 * Ambil insentif per karyawan untuk rentang tanggal (dijumlahkan dari
 * baris transaksi tersimpan). Admin cabang hanya tim cabangnya.
 */
export async function ambilInsentifAdmin(
  dari: string,
  sampai: string,
): Promise<BarisInsentifAdmin[]> {
  const admin = await wajibAkses("insentif");
  if (!tanggalValid(dari) || !tanggalValid(sampai)) return [];
  // Admin cabang hanya tim cabangnya (filter di SQL, pola yang sama
  // dengan pembaca lama); super_admin melihat semua.
  const cabangId =
    admin.role === "admin_cabang" ? (admin.cabangId ?? "") : undefined;
  return ambilInsentifRentang(dari, sampai, cabangId);
}

/** Satu baris pemetaan nama iNOX -> user (seperti include user Prisma). */
export type BarisPemetaanInsentif = {
  id: string;
  namaInox: string;
  namaKunci: string;
  userId: string;
  dibuatPada: Date;
  user: { id: string; name: string };
};

/** Daftar pemetaan nama iNOX -> user (super_admin). */
export async function ambilPemetaanInsentif(): Promise<BarisPemetaanInsentif[]> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return [];
  const rows = await db.$queryRaw<{
    id: string;
    namaInox: string;
    namaKunci: string;
    userId: string;
    dibuatPada: Date;
    user_id: string;
    user_name: string;
  }[]>`
    SELECT p."id", p."namaInox", p."namaKunci", p."userId", p."dibuatPada",
      u."id" AS "user_id", u."name" AS "user_name"
    FROM "PemetaanInsentif" p
    JOIN "User" u ON u."id" = p."userId"
    ORDER BY p."namaInox" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    namaInox: r.namaInox,
    namaKunci: r.namaKunci,
    userId: r.userId,
    dibuatPada: r.dibuatPada,
    user: { id: r.user_id, name: r.user_name },
  }));
}

/** Daftar pengguna aktif untuk dropdown pemetaan (super_admin). */
export async function ambilPenggunaAktif() {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return [];
  return db.user.findMany({
    where: { aktif: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type HasilPemetaan = {
  ok: boolean;
  pesan: string;
};

/**
 * Pasangkan satu nama iNOX ke satu akun pengguna. Sekali disimpan,
 * sinkron berikutnya otomatis memakai pemetaan ini. Bila nama yang sama
 * sudah terpetakan, pemetaan diperbarui ke akun yang dipilih.
 */
export async function simpanPemetaanInsentifForm(
  _prev: HasilPemetaan | undefined,
  formData: FormData,
): Promise<HasilPemetaan> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super_admin dapat mengatur pemetaan." };
  }
  const namaInox = ((formData.get("namaInox") as string) ?? "").trim();
  const userId = ((formData.get("userId") as string) ?? "").trim();
  if (!namaInox || !userId) {
    return { ok: false, pesan: "Nama iNOX dan karyawan wajib diisi." };
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, aktif: true },
  });
  if (!user || !user.aktif) {
    return { ok: false, pesan: "Karyawan tidak ditemukan atau tidak aktif." };
  }
  // Upsert lewat SQL mentah (lihat lib/insentif.ts kenapa): update dulu,
  // insert bila belum ada — jalan di Postgres maupun SQLite tanpa ON CONFLICT.
  const namaKunci = normalisasiNama(namaInox);
  const diubah = await db.$executeRaw`
    UPDATE "PemetaanInsentif" SET "namaInox" = ${namaInox}, "userId" = ${userId}
    WHERE "namaKunci" = ${namaKunci}
  `;
  if (diubah === 0) {
    await db.$executeRaw`
      INSERT INTO "PemetaanInsentif" ("id", "namaInox", "namaKunci", "userId")
      VALUES (${randomUUID()}, ${namaInox}, ${namaKunci}, ${userId})
    `;
  }
  revalidatePath("/admin/insentif");
  return {
    ok: true,
    pesan: `Nama "${namaInox}" dipetakan ke ${user.name}. Sinkron berikutnya otomatis memakai pemetaan ini.`,
  };
}

/** Hapus satu pemetaan nama iNOX (super_admin). */
export async function hapusPemetaanInsentif(formData: FormData): Promise<void> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return;
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return;
  await db.$executeRaw`
    DELETE FROM "PemetaanInsentif" WHERE "id" = ${id}
  `.catch(() => null);
  revalidatePath("/admin/insentif");
}

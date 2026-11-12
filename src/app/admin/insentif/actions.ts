"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  jalankanSinkronInsentif,
  normalisasiNama,
  type BarisInsentif,
} from "@/lib/insentif";
import { wajibAkses } from "@/lib/session";
import { periodeValid } from "@/lib/rekap";

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

/** Baris Insentif beserta user + cabang (seperti include user/cabang Prisma). */
export type BarisInsentifAdmin = BarisInsentif & {
  user: {
    id: string;
    name: string;
    username: string | null;
    cabang: { nama: string } | null;
  };
};

/** Ambil semua insentif untuk periode (admin). Admin cabang hanya tim cabangnya. */
export async function ambilInsentifAdmin(
  periode: string,
): Promise<BarisInsentifAdmin[]> {
  const admin = await wajibAkses("insentif");
  // SQL mentah (lihat lib/insentif.ts kenapa): delegate Insentif belum ada
  // di generated client VM ini. Filter cabang ikut di SQL: super_admin
  // melihat semua (parameter pertama true), admin_cabang hanya tim cabangnya.
  const rows = await db.$queryRaw<{
    id: string;
    userId: string;
    periode: string;
    jumlah: number;
    jumlahTransaksi: number;
    tanggalAwal: string | null;
    tanggalAkhir: string | null;
    sinkronPada: Date;
    user_id: string;
    user_name: string;
    user_username: string | null;
    cabang_nama: string | null;
  }[]>`
    SELECT i."id", i."userId", i."periode", i."jumlah", i."jumlahTransaksi",
      i."tanggalAwal", i."tanggalAkhir", i."sinkronPada",
      u."id" AS "user_id", u."name" AS "user_name", u."username" AS "user_username",
      c."nama" AS "cabang_nama"
    FROM "Insentif" i
    JOIN "User" u ON u."id" = i."userId"
    LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
    WHERE i."periode" = ${periode}
      AND (${admin.role !== "admin_cabang"} OR u."cabangId" = ${admin.cabangId ?? ""})
    ORDER BY u."name" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    periode: r.periode,
    jumlah: r.jumlah,
    jumlahTransaksi: r.jumlahTransaksi,
    tanggalAwal: r.tanggalAwal,
    tanggalAkhir: r.tanggalAkhir,
    sinkronPada: r.sinkronPada,
    user: {
      id: r.user_id,
      name: r.user_name,
      username: r.user_username,
      cabang: r.cabang_nama ? { nama: r.cabang_nama } : null,
    },
  }));
}

/** Ambil insentif satu user untuk periode (karyawan lihat sendiri). */
export async function ambilInsentifSaya(
  userId: string,
  periode: string,
): Promise<BarisInsentif | null> {
  const admin = await wajibAkses("insentif");
  // karyawan hanya boleh lihat sendiri
  if (admin.role === "karyawan" && admin.id !== userId) {
    return null;
  }
  const rows = await db.$queryRaw<BarisInsentif[]>`
    SELECT "id", "userId", "periode", "jumlah", "jumlahTransaksi",
      "tanggalAwal", "tanggalAkhir", "sinkronPada"
    FROM "Insentif"
    WHERE "userId" = ${userId} AND "periode" = ${periode}
  `;
  return rows[0] ?? null;
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

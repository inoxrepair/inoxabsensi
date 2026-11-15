import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  BATAS_CHAT_MS,
  BATAS_MENGETIK_MS,
  BATAS_PESAN_CHAT,
  type PesanChat,
} from "@/lib/chat";

/**
 * Akses database tabel ChatPesan. Semua via raw SQL: client Prisma yang
 * dihasilkan di mesin ini belum mengenal model baru (lihat
 * src/lib/pengaturan.ts). Bila tabel belum ada (sebelum migrasi
 * 20261115010000 jalan), baca mengembalikan [] supaya halaman chat
 * tetap bisa dibuka — pola yang sama dengan bacaLogoAplikasi.
 *
 * Pesan kadaluarsa (lebih dari 24 jam) tidak pernah ditampilkan (filter
 * di query) dan dihapus permanen oleh sapuPesanKadaluarsa() tiap kali
 * chat dibaca atau dikirim.
 */

type BarisPesan = {
  id: string;
  pengirimId: string;
  nama: string | null;
  fotoProfil: string | null;
  isi: string;
  foto: string | null;
  suara: string | null;
  dibuatPada: Date;
};

function kePesan(b: BarisPesan): PesanChat {
  return {
    id: b.id,
    pengirimId: b.pengirimId,
    nama: b.nama ?? "Karyawan",
    fotoProfil: b.fotoProfil,
    isi: b.isi,
    foto: b.foto,
    suara: b.suara,
    dibuatPada: new Date(b.dibuatPada),
  };
}

/** Hapus permanen pesan yang sudah lewat 24 jam. Tidak pernah melempar. */
export async function sapuPesanKadaluarsa(): Promise<void> {
  try {
    const batas = new Date(Date.now() - BATAS_CHAT_MS).toISOString();
    await db.$executeRaw`DELETE FROM "ChatPesan" WHERE "dibuatPada" < ${batas}`;
  } catch {
    // Pembersihan tidak boleh menggagalkan baca/kirim chat.
  }
}

/** Pesan 24 jam terakhir, terlama dulu, maks. BATAS_PESAN_CHAT baris. */
export async function ambilPesanChat(): Promise<PesanChat[]> {
  await sapuPesanKadaluarsa();
  try {
    const batas = new Date(Date.now() - BATAS_CHAT_MS).toISOString();
    const rows = await db.$queryRaw<BarisPesan[]>`
      SELECT p."id", p."pengirimId", p."isi", p."foto", p."suara", p."dibuatPada",
        u."name" AS "nama", u."image" AS "fotoProfil"
      FROM "ChatPesan" p
      LEFT JOIN "User" u ON u."id" = p."pengirimId"
      WHERE p."dibuatPada" >= ${batas}
      ORDER BY p."dibuatPada" ASC
      LIMIT ${BATAS_PESAN_CHAT}
    `;
    return rows.map(kePesan);
  } catch {
    return [];
  }
}

export async function kirimPesanChat(
  pengirimId: string,
  isi: string,
  foto: string | null,
  suara: string | null,
): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "ChatPesan" ("id", "pengirimId", "isi", "foto", "suara")
    VALUES (${randomUUID()}, ${pengirimId}, ${isi}, ${foto}, ${suara})
  `;
}

/**
 * Indikator mengetik: satu baris per pengguna, diperbarui tiap ping.
 * Tidak pernah melempar — indikator tidak boleh menggagalkan chat.
 */
export async function tandaiMengetik(userId: string): Promise<void> {
  try {
    await db.$executeRaw`
      INSERT INTO "ChatMengetik" ("userId", "diperbarui")
      VALUES (${userId}, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET "diperbarui" = CURRENT_TIMESTAMP
    `;
  } catch {
    // Abaikan: indikator bersifat sementara.
  }
}

/** Hapus tanda mengetik pengguna (setelah mengirim pesan). */
export async function berhentiMengetik(userId: string): Promise<void> {
  try {
    await db.$executeRaw`DELETE FROM "ChatMengetik" WHERE "userId" = ${userId}`;
  } catch {
    // Abaikan: baris kedaluwarsa dengan sendirinya.
  }
}

/** Nama pengguna lain yang sedang mengetik (maks. 3, tanpa diri sendiri). */
export async function ambilYangMengetik(userIdSaya: string): Promise<string[]> {
  try {
    const batas = new Date(Date.now() - BATAS_MENGETIK_MS).toISOString();
    await db.$executeRaw`DELETE FROM "ChatMengetik" WHERE "diperbarui" < ${batas}`;
    const rows = await db.$queryRaw<{ nama: string | null }[]>`
      SELECT u."name" AS "nama"
      FROM "ChatMengetik" m
      LEFT JOIN "User" u ON u."id" = m."userId"
      WHERE m."diperbarui" >= ${batas} AND m."userId" != ${userIdSaya}
      ORDER BY m."diperbarui" DESC
      LIMIT 3
    `;
    return rows.map((r) => r.nama ?? "Karyawan");
  } catch {
    return [];
  }
}

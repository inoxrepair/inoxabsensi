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
 *
 * PENTING: batas waktu dikirim sebagai objek Date, BUKAN string ISO.
 * Postgres menolak parameter teks dibanding kolom timestamp
 * ("operator does not exist: timestamp >= text") sehingga baca chat
 * selalu gagal diam-diam di production — sementara SQLite lokal
 * mengonversi string bebas, jadi repro lokal lolos. Itu penyebab bubble
 * chat tidak pernah muncul walau pesan tersimpan (ditemukan 2026-11-15).
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
    // Objek Date (bukan string ISO): lihat catatan di atas file.
    const batas = new Date(Date.now() - BATAS_CHAT_MS);
    await db.$executeRaw`DELETE FROM "ChatPesan" WHERE "dibuatPada" < ${batas}`;
  } catch (error) {
    // Pembersihan tidak boleh menggagalkan baca/kirim chat, tapi kegagalan
    // dicatat supaya terlihat di log server bila tabel bermasalah.
    console.error("[chat] sapuPesanKadaluarsa gagal:", error);
  }
}

/** Pesan 24 jam terakhir, terlama dulu, maks. BATAS_PESAN_CHAT baris. */
export async function ambilPesanChat(): Promise<PesanChat[]> {
  await sapuPesanKadaluarsa();
  try {
    // Objek Date (bukan string ISO): lihat catatan di atas file.
    const batas = new Date(Date.now() - BATAS_CHAT_MS);
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
  } catch (error) {
    // Halaman chat tetap bisa dibuka bila tabel bermasalah, tapi kegagalan
    // dicatat supaya terlihat di log server (bukan hilang diam-diam).
    console.error("[chat] ambilPesanChat gagal:", error);
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
  } catch (error) {
    // Abaikan: indikator bersifat sementara, tapi catat bila tabel rusak.
    console.error("[chat] tandaiMengetik gagal:", error);
  }
}

/** Hapus tanda mengetik pengguna (setelah mengirim pesan). */
export async function berhentiMengetik(userId: string): Promise<void> {
  try {
    await db.$executeRaw`DELETE FROM "ChatMengetik" WHERE "userId" = ${userId}`;
  } catch (error) {
    // Abaikan: baris kedaluwarsa dengan sendirinya.
    console.error("[chat] berhentiMengetik gagal:", error);
  }
}

/** Nama pengguna lain yang sedang mengetik (maks. 3, tanpa diri sendiri). */
export async function ambilYangMengetik(userIdSaya: string): Promise<string[]> {
  try {
    // Objek Date (bukan string ISO): lihat catatan di atas file.
    const batas = new Date(Date.now() - BATAS_MENGETIK_MS);
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
  } catch (error) {
    console.error("[chat] ambilYangMengetik gagal:", error);
    return [];
  }
}

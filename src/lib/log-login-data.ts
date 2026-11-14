import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { bacaJenisLogLogin, type BarisLogLogin } from "@/lib/log-login";
import {
  apakahIdPerangkatValid,
  NAMA_COOKIE_PERANGKAT,
} from "@/lib/perangkat-id";

/**
 * Akses database tabel LogLogin. Semua via raw SQL: client Prisma yang
 * dihasilkan di mesin ini belum mengenal model baru (lihat
 * src/lib/pengaturan.ts). Pencatatan tidak pernah melempar — login/logout
 * tetap jalan walau pencatatan gagal (mis. tabel belum ada sebelum
 * migrasi 20261114010000 jalan).
 */

/** IP publik + User-Agent dari header request; tidak pernah melempar. */
export async function bacaIpDanAgen(): Promise<{ ip: string; agen: string }> {
  try {
    const header = await headers();
    const ip =
      header.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      header.get("x-real-ip") ||
      "tidak-diketahui";
    return { ip, agen: header.get("user-agent") ?? "" };
  } catch {
    return { ip: "tidak-diketahui", agen: "" };
  }
}

/** ID perangkat dari cookie browser; null bila tidak ada/tidak valid. */
export async function bacaIdPerangkatCookie(): Promise<string | null> {
  try {
    const s = await cookies();
    const nilai = s.get(NAMA_COOKIE_PERANGKAT)?.value;
    return nilai && apakahIdPerangkatValid(nilai) ? nilai : null;
  } catch {
    return null;
  }
}

/** Catat satu baris login/logout. Tidak pernah melempar. */
export async function catatLogLogin(
  userId: string,
  jenis: "masuk" | "keluar",
): Promise<void> {
  try {
    const { ip, agen } = await bacaIpDanAgen();
    const perangkatId = await bacaIdPerangkatCookie();
    await db.$executeRaw`
      INSERT INTO "LogLogin" ("id", "userId", "jenis", "ip", "agen", "perangkatId")
      VALUES (${randomUUID()}, ${userId}, ${jenis}, ${ip}, ${agen}, ${perangkatId})
    `;
  } catch {
    // Abaikan: login/logout tetap jalan walau pencatatan gagal.
  }
}

type BarisMentah = {
  id: string;
  userId: string;
  cabangId: string;
  nama: string;
  cabang: string;
  jenis: string;
  ip: string;
  agen: string;
  perangkatId: string | null;
  dibuatPada: Date;
};

/**
 * Semua baris dalam rentang tanggal (WITA), terbaru dulu, maksimal 2000
 * baris. Filter cabang/karyawan/jenis dilakukan di halaman (TypeScript)
 * supaya query tetap satu bentuk dan aman di SQLite maupun PostgreSQL.
 */
export async function ambilLogLogin(
  dari: string,
  sampai: string,
): Promise<BarisLogLogin[]> {
  try {
    const awal = new Date(`${dari}T00:00:00+08:00`);
    const akhir = new Date(`${sampai}T23:59:59.999+08:00`);
    const rows = await db.$queryRaw<BarisMentah[]>`
      SELECT l."id", l."userId", l."jenis", l."ip", l."agen", l."perangkatId", l."dibuatPada",
        u."name" AS "nama", u."cabangId" AS "cabangId",
        COALESCE(c."nama", '—') AS "cabang"
      FROM "LogLogin" l
      JOIN "User" u ON u."id" = l."userId"
      LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
      WHERE l."dibuatPada" >= ${awal} AND l."dibuatPada" <= ${akhir}
      ORDER BY l."dibuatPada" DESC
      LIMIT 2000
    `;
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      cabangId: r.cabangId,
      nama: r.nama,
      cabang: r.cabang,
      jenis: bacaJenisLogLogin(r.jenis),
      ip: r.ip,
      agen: r.agen,
      perangkatId: r.perangkatId,
      dibuatPada: r.dibuatPada,
    }));
  } catch {
    return [];
  }
}

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  bacaAksiCta,
  bacaHalamanKaryawan,
  informasiAktifHariIni,
  type InformasiItem,
} from "@/lib/informasi";

/**
 * Akses database tabel Informasi. Semua via raw SQL: client Prisma yang
 * dihasilkan di mesin ini belum mengenal model baru (lihat
 * src/lib/pengaturan.ts). Bila tabel belum ada (sebelum migrasi
 * 20261114000000 jalan), baca mengembalikan [] supaya halaman karyawan
 * tetap bisa dibuka — pola yang sama dengan bacaLogoAplikasi.
 */

type BarisInformasi = {
  id: string;
  judul: string;
  isi: string;
  ctaLabel: string;
  ctaAksi: string;
  ctaTautan: string | null;
  ctaHalaman: string | null;
  mulaiTanggal: string;
  durasiHari: number;
  aktif: boolean;
  createdAt: Date;
};

function keItem(b: BarisInformasi): InformasiItem {
  return {
    id: b.id,
    judul: b.judul,
    isi: b.isi,
    ctaLabel: b.ctaLabel || "Mengerti",
    ctaAksi: bacaAksiCta(b.ctaAksi),
    ctaTautan: b.ctaTautan,
    ctaHalaman: bacaHalamanKaryawan(b.ctaHalaman),
    mulaiTanggal: b.mulaiTanggal,
    durasiHari: b.durasiHari,
    aktif: b.aktif,
    dibuatPada: b.createdAt.toISOString().slice(0, 10),
  };
}

/** Semua pesan, terbaru dulu (untuk menu admin). */
export async function ambilSemuaInformasi(): Promise<InformasiItem[]> {
  try {
    const rows = await db.$queryRaw<BarisInformasi[]>`
      SELECT "id", "judul", "isi", "ctaLabel", "ctaAksi", "ctaTautan",
        "ctaHalaman", "mulaiTanggal", "durasiHari", "aktif", "createdAt"
      FROM "Informasi"
      ORDER BY "createdAt" DESC
    `;
    return rows.map(keItem);
  } catch {
    return [];
  }
}

/** Pesan yang tampil hari ini (toggle aktif + dalam masa tampil), terbaru dulu. */
export async function ambilInformasiAktif(
  hariIni: string,
): Promise<InformasiItem[]> {
  try {
    const rows = await db.$queryRaw<BarisInformasi[]>`
      SELECT "id", "judul", "isi", "ctaLabel", "ctaAksi", "ctaTautan",
        "ctaHalaman", "mulaiTanggal", "durasiHari", "aktif", "createdAt"
      FROM "Informasi"
      WHERE "aktif" = true
      ORDER BY "createdAt" DESC
    `;
    return informasiAktifHariIni(rows.map(keItem), hariIni);
  } catch {
    return [];
  }
}

export type DataInformasi = {
  judul: string;
  isi: string;
  ctaLabel: string;
  ctaAksi: string;
  ctaTautan: string | null;
  ctaHalaman: string | null;
  mulaiTanggal: string;
  durasiHari: number;
  aktif: boolean;
};

export async function tambahInformasi(data: DataInformasi): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "Informasi"
      ("id", "judul", "isi", "ctaLabel", "ctaAksi", "ctaTautan", "ctaHalaman",
       "mulaiTanggal", "durasiHari", "aktif")
    VALUES (${randomUUID()}, ${data.judul}, ${data.isi}, ${data.ctaLabel},
      ${data.ctaAksi}, ${data.ctaTautan}, ${data.ctaHalaman},
      ${data.mulaiTanggal}, ${data.durasiHari}, ${data.aktif})
  `;
}

export async function ubahInformasi(
  id: string,
  data: DataInformasi,
): Promise<void> {
  await db.$executeRaw`
    UPDATE "Informasi" SET
      "judul" = ${data.judul}, "isi" = ${data.isi},
      "ctaLabel" = ${data.ctaLabel}, "ctaAksi" = ${data.ctaAksi},
      "ctaTautan" = ${data.ctaTautan}, "ctaHalaman" = ${data.ctaHalaman},
      "mulaiTanggal" = ${data.mulaiTanggal}, "durasiHari" = ${data.durasiHari},
      "aktif" = ${data.aktif}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `;
}

export async function ubahAktifInformasi(
  id: string,
  aktif: boolean,
): Promise<void> {
  await db.$executeRaw`
    UPDATE "Informasi" SET
      "aktif" = ${aktif}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `;
}

export async function hapusInformasi(id: string): Promise<void> {
  await db.$executeRaw`DELETE FROM "Informasi" WHERE "id" = ${id}`;
}

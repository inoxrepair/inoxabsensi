import { db } from "@/lib/db";

export const KUNCI_LOGO_APLIKASI = "logo_aplikasi";

/**
 * Logo kustom (data URL) bila sudah diunggah lewat Pengaturan, null bila belum.
 *
 * Sengaja lewat SQL mentah, bukan delegate Prisma: delegate baru tersedia
 * setelah `prisma generate` dijalankan ulang, sedangkan generate di VM ini
 * gagal mengunduh engine (jaringan proxy). Tabelnya tetap didefinisikan di
 * schema Prisma + migrasi Postgres, jadi delegate bisa dipakai nanti setelah
 * generate berhasil (mis. saat build di VPS). SQL di sini kompatibel dengan
 * Postgres (produksi) maupun SQLite (dev lokal).
 */
export async function bacaLogoAplikasi(): Promise<string | null> {
  try {
    const rows = await db.$queryRaw<{ nilai: string }[]>`
      SELECT "nilai" FROM "Pengaturan" WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
    `;
    return rows[0]?.nilai ?? null;
  } catch {
    // Tabel belum ada (migrasi belum jalan): anggap belum ada logo kustom.
    return null;
  }
}

/**
 * Versi logo kustom (waktu terakhir diubah, dalam milidetik) atau null bila
 * belum ada logo kustom. Dipakai sebagai query `?v=` di src gambar logo,
 * supaya setelah logo diganti di Pengaturan, header yang tidak di-remount
 * saat navigasi client-side tetap memuat gambar baru (src berubah, bukan
 * src yang sama yang dipertahankan browser).
 */
export async function bacaVersiLogo(): Promise<string | null> {
  try {
    const rows = await db.$queryRaw<{ updatedAt: Date }[]>`
      SELECT "updatedAt" FROM "Pengaturan" WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
    `;
    const waktu = rows[0]?.updatedAt;
    return waktu ? String(new Date(waktu).getTime()) : null;
  } catch {
    return null;
  }
}

/** Kunci siklus gajian di tabel Pengaturan. */
export const KUNCI_SIKLUS_GAJIAN_AWAL = "siklus_gajian_awal";
export const KUNCI_SIKLUS_GAJIAN_AKHIR = "siklus_gajian_akhir";

/** Default siklus gajian: 28 bulan sebelumnya s.d. 27 bulan periode. */
export const SIKLUS_GAJIAN_AWAL_DEFAULT = 28;
export const SIKLUS_GAJIAN_AKHIR_DEFAULT = 27;

export type SiklusGajian = { awal: number; akhir: number };

function bacaTanggal(nilai: string | undefined, cadangan: number): number {
  const n = Number(nilai);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : cadangan;
}

/**
 * Baca siklus gajian dari tabel Pengaturan. Nilai yang belum diatur atau
 * tidak sah memakai default 28–27.
 *
 * Seperti bacaLogoAplikasi: lewat SQL mentah supaya tetap jalan walau
 * delegate Prisma belum di-generate ulang.
 */
export async function ambilSiklusGajian(): Promise<SiklusGajian> {
  try {
    const rows = await db.$queryRaw<{ kunci: string; nilai: string }[]>`
      SELECT "kunci", "nilai" FROM "Pengaturan"
      WHERE "kunci" IN (${KUNCI_SIKLUS_GAJIAN_AWAL}, ${KUNCI_SIKLUS_GAJIAN_AKHIR})
    `;
    const peta = new Map(rows.map((r) => [r.kunci, r.nilai]));
    return {
      awal: bacaTanggal(
        peta.get(KUNCI_SIKLUS_GAJIAN_AWAL),
        SIKLUS_GAJIAN_AWAL_DEFAULT,
      ),
      akhir: bacaTanggal(
        peta.get(KUNCI_SIKLUS_GAJIAN_AKHIR),
        SIKLUS_GAJIAN_AKHIR_DEFAULT,
      ),
    };
  } catch {
    return {
      awal: SIKLUS_GAJIAN_AWAL_DEFAULT,
      akhir: SIKLUS_GAJIAN_AKHIR_DEFAULT,
    };
  }
}

/**
 * Simpan siklus gajian ke tabel Pengaturan (tanggal 1–31). Berlaku untuk
 * sinkron berikutnya; sinkron ulang periode berjalan bila perlu.
 */
export async function simpanSiklusGajian(
  awal: number,
  akhir: number,
): Promise<void> {
  if (
    !Number.isInteger(awal) ||
    !Number.isInteger(akhir) ||
    awal < 1 ||
    awal > 31 ||
    akhir < 1 ||
    akhir > 31
  ) {
    throw new Error("Tanggal siklus gajian harus 1–31.");
  }
  await db.$executeRaw`
    INSERT INTO "Pengaturan" ("kunci", "nilai", "updatedAt")
    VALUES (${KUNCI_SIKLUS_GAJIAN_AWAL}, ${String(awal)}, CURRENT_TIMESTAMP)
    ON CONFLICT ("kunci") DO UPDATE SET "nilai" = EXCLUDED."nilai", "updatedAt" = CURRENT_TIMESTAMP
  `;
  await db.$executeRaw`
    INSERT INTO "Pengaturan" ("kunci", "nilai", "updatedAt")
    VALUES (${KUNCI_SIKLUS_GAJIAN_AKHIR}, ${String(akhir)}, CURRENT_TIMESTAMP)
    ON CONFLICT ("kunci") DO UPDATE SET "nilai" = EXCLUDED."nilai", "updatedAt" = CURRENT_TIMESTAMP
  `;
}

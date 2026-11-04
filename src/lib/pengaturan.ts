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

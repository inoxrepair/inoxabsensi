-- Pesan informasi untuk popup setelah absen masuk (menu Informasi).
-- Tabel baru saja; tidak menyentuh data lama.
CREATE TABLE "Informasi" (
  "id" TEXT NOT NULL,
  "judul" TEXT NOT NULL,
  "isi" TEXT NOT NULL,
  "ctaLabel" TEXT NOT NULL DEFAULT 'Mengerti',
  "ctaAksi" TEXT NOT NULL DEFAULT 'tutup',
  "ctaTautan" TEXT,
  "ctaHalaman" TEXT,
  "mulaiTanggal" TEXT NOT NULL,
  "durasiHari" INTEGER NOT NULL DEFAULT 3,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Informasi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Informasi_aktif_mulaiTanggal_idx" ON "Informasi" ("aktif", "mulaiTanggal");

-- Menu Informasi hanya untuk super_admin (sesuai AKSES_DEFAULT di
-- src/lib/domain.ts). ON CONFLICT DO NOTHING supaya migrasi ini aman
-- diulang dan tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'informasi')
ON CONFLICT DO NOTHING;

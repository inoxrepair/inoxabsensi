-- Tabel snapshot slip gaji (menu Slip Gaji, super_admin): angka disalin
-- dari hitungPayroll saat slip dibuat, supaya riwayat tidak berubah bila
-- data absensi/gaji nanti diedit. Status "dibuat" saat snapshot dibuat,
-- "dibayar" setelah ditandai dibayar. Tanpa relasi ke User supaya riwayat
-- tidak ikut terhapus bila karyawan dihapus (pola AuditLog); nama disimpan
-- sebagai snapshot untuk tampilan riwayat.
CREATE TABLE "SlipGaji" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nama" TEXT NOT NULL DEFAULT '',
  "periode" TEXT NOT NULL,
  "gajiPokok" INTEGER NOT NULL DEFAULT 0,
  "gajiPokokFleksibel" INTEGER NOT NULL DEFAULT 0,
  "gajiPokokHarian" INTEGER NOT NULL DEFAULT 0,
  "tunjangan" INTEGER NOT NULL DEFAULT 0,
  "tunjanganMakan" INTEGER NOT NULL DEFAULT 0,
  "lembur" INTEGER NOT NULL DEFAULT 0,
  "insentif" INTEGER NOT NULL DEFAULT 0,
  "potonganTelat" INTEGER NOT NULL DEFAULT 0,
  "kasbon" INTEGER NOT NULL DEFAULT 0,
  "diterima" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'dibuat',
  "dibuatOleh" TEXT,
  "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dibayarOleh" TEXT,
  "dibayarPada" TIMESTAMP(3),
  CONSTRAINT "SlipGaji_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlipGaji_userId_periode_key" ON "SlipGaji" ("userId", "periode");
CREATE INDEX "SlipGaji_periode_idx" ON "SlipGaji" ("periode");
CREATE INDEX "SlipGaji_userId_idx" ON "SlipGaji" ("userId");

-- Menu Slip Gaji hanya untuk super_admin (sesuai AKSES_DEFAULT di
-- src/lib/domain.ts). ON CONFLICT DO NOTHING supaya migrasi ini aman
-- diulang dan tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'slip-gaji')
ON CONFLICT DO NOTHING;

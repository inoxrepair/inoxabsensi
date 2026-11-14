-- Riwayat login/logout karyawan (menu Log Login, super_admin).
-- Tabel baru saja; tidak menyentuh data lama. Login gagal tidak dicatat.
CREATE TABLE "LogLogin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jenis" TEXT NOT NULL,
  "ip" TEXT NOT NULL DEFAULT 'tidak-diketahui',
  "agen" TEXT NOT NULL DEFAULT '',
  "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LogLogin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LogLogin_userId_dibuatPada_idx" ON "LogLogin" ("userId", "dibuatPada");
CREATE INDEX "LogLogin_dibuatPada_idx" ON "LogLogin" ("dibuatPada");

-- Menu Log Login hanya untuk super_admin (sesuai AKSES_DEFAULT di
-- src/lib/domain.ts). ON CONFLICT DO NOTHING supaya migrasi ini aman
-- diulang dan tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'log-login')
ON CONFLICT DO NOTHING;

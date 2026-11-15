-- Ruang chat bersama (menu Chat): satu ruang untuk semua karyawan.
-- Pesan hanya bertahan 24 jam; baris kadaluarsa dihapus permanen oleh
-- sapuPesanKadaluarsa() tiap kali chat dibaca atau dikirim.
CREATE TABLE "ChatPesan" (
  "id" TEXT NOT NULL,
  "pengirimId" TEXT NOT NULL,
  "isi" TEXT NOT NULL DEFAULT '',
  "foto" TEXT,
  "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatPesan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatPesan_dibuatPada_idx" ON "ChatPesan" ("dibuatPada");

-- Menu Chat untuk super_admin, admin_cabang, dan headstore (sesuai
-- AKSES_DEFAULT di src/lib/domain.ts). Karyawan memakai bottom nav
-- (tidak lewat tabel RolePermission). ON CONFLICT DO NOTHING supaya
-- migrasi ini aman diulang dan tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'chat'),
  ('admin_cabang', 'chat'),
  ('headstore', 'chat')
ON CONFLICT DO NOTHING;

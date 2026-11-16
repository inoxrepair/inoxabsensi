-- Menu Absen di sidebar admin (membuka halaman absen /karyawan yang sama).
-- Admin cabang & headstore sudah punya jadwal shift dan server action absen
-- memang tidak membatasi role, jadi yang kurang hanya jalan masuknya.
-- ON CONFLICT DO NOTHING supaya migrasi ini aman diulang dan tidak bentrok
-- bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'absen'),
  ('admin_cabang', 'absen'),
  ('headstore', 'absen')
ON CONFLICT DO NOTHING;

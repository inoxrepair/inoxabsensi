-- Menu Top 10 di sidebar admin (peringkat yang sama dengan versi
-- karyawan). ON CONFLICT DO NOTHING supaya migrasi ini aman diulang dan
-- tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'top5'),
  ('admin_cabang', 'top5'),
  ('headstore', 'top5')
ON CONFLICT DO NOTHING;

-- Beri hak akses menu Insentif (super_admin + admin_cabang, sesuai
-- AKSES_DEFAULT di src/lib/domain.ts).
-- Commit 748809f menambah menu "insentif" di kode, tapi tidak mengisi
-- tabel RolePermission — akibatnya menu tidak muncul untuk siapa pun
-- walau kode sudah ter-deploy. ON CONFLICT DO NOTHING supaya migrasi
-- ini aman diulang dan tidak bentrok bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('super_admin', 'insentif'),
  ('admin_cabang', 'insentif')
ON CONFLICT DO NOTHING;

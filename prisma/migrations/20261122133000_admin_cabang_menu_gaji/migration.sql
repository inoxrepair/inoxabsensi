-- Menu Payroll, Slip Gaji, dan Log Login untuk admin cabang.
-- Halaman-halamannya sudah dipaksa ke cabang admin itu sendiri (parameter
-- cabang dari URL diabaikan), jadi baris ini aman dibuka. Payroll +
-- Slip Gaji tambahan dikunci toggle Pengaturan admin_cabang_lihat_gaji.
-- "cabang", "informasi", dan "pengaturan" sengaja TIDAK dibuka:
-- cabang mengelola cabang lain, informasi broadcast global tanpa kolom
-- cabangId, pengaturan memuat editor Hak Akses (eskalasi hak sendiri).
-- ON CONFLICT DO NOTHING supaya migrasi ini aman diulang dan tidak bentrok
-- bila baris sudah diisi manual.
INSERT INTO "RolePermission" ("role", "menu") VALUES
  ('admin_cabang', 'payroll'),
  ('admin_cabang', 'slip-gaji'),
  ('admin_cabang', 'log-login')
ON CONFLICT DO NOTHING;

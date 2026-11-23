-- Hapus fitur chat (disetujui Ucok 23 Nov 2026: 0 pesan dalam 24 jam terakhir,
-- menduplikasi WhatsApp). Tabel chat dihapus beserta baris hak akses menunya;
-- migrasi lama yang membuat tabel ini dibiarkan sebagai riwayat.
DROP TABLE IF EXISTS "ChatDibaca";
DROP TABLE IF EXISTS "ChatMengetik";
DROP TABLE IF EXISTS "ChatPesan";
DELETE FROM "RolePermission" WHERE "menu" = 'chat';

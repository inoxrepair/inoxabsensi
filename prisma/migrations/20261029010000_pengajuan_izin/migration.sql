-- Pengajuan izin/sakit. Perubahan aditif saja: tabel baru, tidak ada
-- DROP, RENAME, atau ubah kolom lama. Baris Absensi yang dibuat dari
-- pengajuan yang disetujui tetap berstatus "izin" (kolom Absensi tidak
-- diubah), jadi migrasi ini tidak menyentuh tabel Absensi sama sekali.
-- Belum diterapkan ke database mana pun; dijalankan lewat jalur deploy.

CREATE TABLE "PengajuanIzin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dari" TEXT NOT NULL,
    "sampai" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "buktiKeterangan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "catatanAdmin" TEXT,
    "diprosesOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengajuanIzin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PengajuanIzin_userId_status_idx" ON "PengajuanIzin"("userId", "status");
CREATE INDEX "PengajuanIzin_status_idx" ON "PengajuanIzin"("status");

ALTER TABLE "PengajuanIzin" ADD CONSTRAINT "PengajuanIzin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

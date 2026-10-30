-- Snapshot toleransi/kotor saat check-in, pembayaran parsial kasbon,
-- status kasbon dibatalkan (nilai string, tanpa perubahan kolom),
-- dan jejak audit penghapusan log absensi.
-- Semua perubahan aditif: tidak ada DROP, RENAME, atau ubah kolom lama.
-- Kolom Absensi baru nullable supaya baris legacy tetap valid; rekap
-- memakai hitungan lama sebagai fallback hanya bila nilainya null.

ALTER TABLE "Absensi" ADD COLUMN "menitToleransi" INTEGER;
ALTER TABLE "Absensi" ADD COLUMN "menitKotor" INTEGER;

ALTER TABLE "Kasbon" ADD COLUMN "jumlahTerbayar" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "targetUserId" TEXT,
    "tanggal" TEXT,
    "ringkasan" TEXT NOT NULL,
    "dilakukanOleh" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_aksi_dibuatPada_idx" ON "AuditLog"("aksi", "dibuatPada");

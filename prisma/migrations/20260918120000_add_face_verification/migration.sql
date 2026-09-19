-- Verifikasi wajah saat absen. Semua kolom nullable sehingga data lama
-- tidak tersentuh dan tidak perlu backfill.
--
-- User.faceEmbedding menyimpan vektor wajah 128 angka sebagai JSON, bukan
-- foto, sehingga tidak dapat dikembalikan menjadi gambar.
ALTER TABLE "User" ADD COLUMN "faceEmbedding" TEXT;
ALTER TABLE "User" ADD COLUMN "faceDidaftarkan" TEXT;

-- Hasil verifikasi disimpan per baris absensi untuk audit admin.
ALTER TABLE "Absensi" ADD COLUMN "faceStatus" TEXT;
ALTER TABLE "Absensi" ADD COLUMN "faceJarak" DOUBLE PRECISION;
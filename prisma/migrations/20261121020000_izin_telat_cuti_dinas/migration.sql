-- Jenis pengajuan baru: izin telat, cuti, dinas luar, izin pulang cepat.
-- Izin telat / pulang cepat menyimpan batas jam yang diizinkan (menit
-- sejak tengah malam) dan TIDAK membuat baris Absensi — batas itu dipakai
-- saat check-in/check-out. Bukti foto disimpan sebagai data URL seperti
-- foto chat. IzinDibaca mencatat kapan karyawan terakhir membuka halaman
-- izin, untuk lencana pengajuan yang sudah diproses admin.
ALTER TABLE "PengajuanIzin" ADD COLUMN "jamMasukDiizinkan" INTEGER;
ALTER TABLE "PengajuanIzin" ADD COLUMN "jamPulangDiizinkan" INTEGER;
ALTER TABLE "PengajuanIzin" ADD COLUMN "buktiFoto" TEXT;
CREATE TABLE "IzinDibaca" (
  "userId" TEXT NOT NULL,
  "dibacaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IzinDibaca_pkey" PRIMARY KEY ("userId")
);

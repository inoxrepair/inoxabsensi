-- Penyesuaian gaji di payroll (diminta Ucok 26 Nov 2026): satu kolom
-- tambahan per karyawan per periode — nominal bertanda (positif =
-- tambahan, negatif = pengurangan) beserta keterangan, tampil di slip
-- gaji. Disimpan di Payroll (nilai live) dan SlipGaji (snapshot beku).
ALTER TABLE "Payroll" ADD COLUMN "penyesuaian" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payroll" ADD COLUMN "keteranganPenyesuaian" TEXT;
ALTER TABLE "SlipGaji" ADD COLUMN "penyesuaian" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SlipGaji" ADD COLUMN "keteranganPenyesuaian" TEXT;

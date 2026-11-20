-- Centang "Dapat tunjangan makan" per karyawan: yang tidak dicentang
-- tidak mendapat tunjangan makan (Rp 20.000 x hari hadir) di payroll.
-- Default true supaya semua karyawan yang sudah ada tetap dapat.
ALTER TABLE "User" ADD COLUMN "dapatTunjanganMakan" BOOLEAN NOT NULL DEFAULT true;

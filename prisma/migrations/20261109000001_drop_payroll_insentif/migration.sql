-- Hapus kolom insentif dari Payroll: satu sumber kebenaran adalah tabel
-- Insentif (hasil sinkron inox.my.id) yang dibaca halaman Payroll.
-- Kolom ini ditulis form payroll tapi tidak pernah dibaca untuk tampil,
-- dan sinkron tidak pernah mengisinya, sehingga hanya membingungkan.
-- Aman dihapus: fitur insentif baru masuk di migrasi sebelumnya dan
-- belum pernah tayang ke production.
ALTER TABLE "Payroll" DROP COLUMN "insentif";

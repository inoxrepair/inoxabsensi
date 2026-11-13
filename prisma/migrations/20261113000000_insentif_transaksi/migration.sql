-- Insentif per baris transaksi (bukan agregat bulanan) supaya laporan bisa
-- dijumlahkan untuk rentang tanggal apa pun. Sinkron menimpa baris dalam
-- rentang yang ditarik (hapus lalu isi ulang), jadi sinkron ulang tidak
-- menggandakan. Tabel Insentif lama (agregat per karyawan per periode)
-- tidak lagi dibaca; dibiarkan sebagai arsip.
CREATE TABLE "InsentifTransaksi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "jumlah" INTEGER NOT NULL,
    "lokasi" TEXT NOT NULL DEFAULT '',
    "sinkronPada" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsentifTransaksi_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InsentifTransaksi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "InsentifTransaksi_userId_tanggal_idx" ON "InsentifTransaksi"("userId", "tanggal");
CREATE INDEX "InsentifTransaksi_tanggal_idx" ON "InsentifTransaksi"("tanggal");

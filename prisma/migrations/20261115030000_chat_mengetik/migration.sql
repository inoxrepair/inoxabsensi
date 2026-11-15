-- Indikator "sedang mengetik" di ruang chat: satu baris per pengguna,
-- diperbarui tiap kali ia mengetik. Baris kedaluwarsa dalam hitungan
-- detik dan dibersihkan saat dibaca — bukan riwayat permanen.
CREATE TABLE "ChatMengetik" (
  "userId" TEXT NOT NULL,
  "diperbarui" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMengetik_pkey" PRIMARY KEY ("userId")
);

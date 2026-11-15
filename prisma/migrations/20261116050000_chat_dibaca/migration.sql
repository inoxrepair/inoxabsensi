-- Kapan terakhir tiap pengguna membuka ruang chat, untuk lencana jumlah
-- pesan belum dibaca di ikon menu Chat. Satu baris per pengguna;
-- pesan dari orang lain yang dibuat setelah waktu ini dihitung belum dibaca.
CREATE TABLE "ChatDibaca" (
  "userId" TEXT NOT NULL,
  "dibacaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatDibaca_pkey" PRIMARY KEY ("userId")
);

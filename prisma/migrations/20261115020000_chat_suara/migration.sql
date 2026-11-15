-- Voice note di ChatPesan (null untuk pesan lama). Ikut terhapus saat
-- pesannya disapu setelah 24 jam, sama seperti foto.
ALTER TABLE "ChatPesan" ADD COLUMN "suara" TEXT;

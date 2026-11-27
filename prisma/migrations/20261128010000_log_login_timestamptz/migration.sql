-- Log login tampil 7 jam lebih maju (login tengah malam WITA tercatat
-- ~07.00): kolom "dibuatPada" adalah TIMESTAMP TANPA zona waktu, dan
-- nilai DEFAULT CURRENT_TIMESTAMP ditulis dalam zona waktu database
-- (WIB, UTC+7) — sementara Prisma membaca TIMESTAMP tanpa zona sebagai
-- UTC, lalu lapisan tampilan menambahkan WITA (+8). Selisihnya persis 7
-- jam. Perbaikan: jadikan kolom TIMESTAMPTZ supaya instans absolutnya
-- tersimpan benar; baris lama dikonversi eksplisit dari WIB (zona waktu
-- server/database), jadi riwayat lama ikut terkoreksi. Default
-- CURRENT_TIMESTAMP tetap berlaku (now() sudah timestamptz).
ALTER TABLE "LogLogin"
  ALTER COLUMN "dibuatPada" TYPE TIMESTAMPTZ(3)
  USING "dibuatPada" AT TIME ZONE 'Asia/Jakarta';

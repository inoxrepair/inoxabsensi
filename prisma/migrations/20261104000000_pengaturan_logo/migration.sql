-- Pengaturan global aplikasi (aditif saja: tabel baru, tidak menyentuh tabel lama).
-- Kunci "logo_aplikasi" menyimpan data URL gambar logo; bila baris tidak ada,
-- aplikasi memakai logo iNOX bawaan.
CREATE TABLE "Pengaturan" (
    "kunci" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pengaturan_pkey" PRIMARY KEY ("kunci")
);

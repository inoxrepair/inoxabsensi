-- Pemetaan nama service_staff inox.my.id -> User iNox Absensi.
-- Sekali dipasangkan, sinkron memakai pemetaan ini (didahulukan atas
-- pencocokan nama), sehingga insentif karyawan yang namanya berbeda
-- di iNOX tetap masuk ke akun yang benar. namaKunci unik supaya satu
-- nama iNOX hanya terpetakan ke satu akun.
CREATE TABLE "PemetaanInsentif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "namaInox" TEXT NOT NULL,
    "namaKunci" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dibuatPada" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PemetaanInsentif_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PemetaanInsentif_namaKunci_key" ON "PemetaanInsentif"("namaKunci");
CREATE INDEX "PemetaanInsentif_userId_idx" ON "PemetaanInsentif"("userId");

CREATE TABLE "JenisSeragam" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JenisSeragam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JenisSeragam_kode_key" ON "JenisSeragam"("kode");
CREATE UNIQUE INDEX "JenisSeragam_nama_key" ON "JenisSeragam"("nama");

ALTER TABLE "Jadwal" ADD COLUMN "seragamId" TEXT;
CREATE INDEX "Jadwal_seragamId_idx" ON "Jadwal"("seragamId");

-- Migrasikan semua teks seragam lama menjadi master global.
INSERT INTO "JenisSeragam" ("id", "kode", "nama", "aktif", "updatedAt")
SELECT
  'legacy_' || md5("seragam"),
  'LEGACY-' || upper(substr(md5("seragam"), 1, 8)),
  "seragam",
  true,
  CURRENT_TIMESTAMP
FROM "Jadwal"
WHERE "seragam" IS NOT NULL AND trim("seragam") <> ''
GROUP BY "seragam"
ON CONFLICT ("nama") DO NOTHING;

UPDATE "Jadwal" j
SET "seragamId" = s."id"
FROM "JenisSeragam" s
WHERE j."seragam" = s."nama";

ALTER TABLE "Jadwal"
ADD CONSTRAINT "Jadwal_seragamId_fkey"
FOREIGN KEY ("seragamId") REFERENCES "JenisSeragam"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

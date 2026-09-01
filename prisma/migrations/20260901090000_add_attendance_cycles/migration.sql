ALTER TABLE "Absensi" ADD COLUMN "maksimalCycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Shift" ADD COLUMN "maksimalCycle" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "AbsensiCycle" (
    "id" TEXT NOT NULL,
    "absensiId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "masukMenit" INTEGER NOT NULL,
    "keluarMenit" INTEGER,
    "masukLat" DOUBLE PRECISION,
    "masukLng" DOUBLE PRECISION,
    "masukJarakMeter" INTEGER,
    "keluarLat" DOUBLE PRECISION,
    "keluarLng" DOUBLE PRECISION,
    "keluarJarakMeter" INTEGER,
    CONSTRAINT "AbsensiCycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AbsensiCycle_absensiId_fkey" FOREIGN KEY ("absensiId") REFERENCES "Absensi"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AbsensiCycle_absensiId_urutan_key" ON "AbsensiCycle"("absensiId", "urutan");
CREATE INDEX "AbsensiCycle_absensiId_idx" ON "AbsensiCycle"("absensiId");

-- Setiap catatan lama menjadi cycle pertama. ID deterministik membuat
-- backfill aman terhadap pengulangan saat migration diperiksa ulang.
INSERT INTO "AbsensiCycle" (
    "id", "absensiId", "urutan", "masukMenit", "keluarMenit",
    "masukLat", "masukLng", "masukJarakMeter",
    "keluarLat", "keluarLng", "keluarJarakMeter"
)
SELECT
    'legacy-' || "id", "id", 1, "masukMenit", "keluarMenit",
    "masukLat", "masukLng", "masukJarakMeter",
    "keluarLat", "keluarLng", "keluarJarakMeter"
FROM "Absensi"
WHERE "masukMenit" IS NOT NULL
ON CONFLICT ("absensiId", "urutan") DO NOTHING;

UPDATE "Absensi"
SET "maksimalCycle" = 3
WHERE "modeShift" = 'fleksibel';

UPDATE "Shift"
SET "maksimalCycle" = 3
WHERE "mode" = 'fleksibel';

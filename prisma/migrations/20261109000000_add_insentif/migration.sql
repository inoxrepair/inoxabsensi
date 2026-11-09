-- Add Insentif model and insentif column to Payroll
CREATE TABLE "Insentif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "jumlahTransaksi" INTEGER NOT NULL DEFAULT 0,
    "tanggalAwal" TEXT,
    "tanggalAkhir" TEXT,
    "sinkronPada" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insentif_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Insentif_userId_periode_key" ON "Insentif"("userId", "periode");
CREATE INDEX "Insentif_periode_idx" ON "Insentif"("periode");
CREATE INDEX "Insentif_userId_periode_idx" ON "Insentif"("userId", "periode");

-- Add insentif column to Payroll
ALTER TABLE "Payroll" ADD COLUMN "insentif" INTEGER NOT NULL DEFAULT 0;

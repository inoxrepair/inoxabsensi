CREATE TABLE "JadwalRevision" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "cabangId" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),
    CONSTRAINT "JadwalRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JadwalRevision_adminId_createdAt_idx" ON "JadwalRevision"("adminId", "createdAt");
CREATE INDEX "JadwalRevision_createdAt_idx" ON "JadwalRevision"("createdAt");

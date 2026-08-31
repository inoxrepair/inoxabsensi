CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'karyawan',
    "jabatan" TEXT NOT NULL DEFAULT '-',
    "tanggalMasuk" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "cabangId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token")
);

CREATE TABLE "Cabang" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeter" INTEGER NOT NULL DEFAULT 100,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Cabang_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mulaiMenit" INTEGER NOT NULL,
    "selesaiMenit" INTEGER NOT NULL,
    "toleransiMenit" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Jadwal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "shiftId" TEXT,
    "seragam" TEXT,
    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "masukMenit" INTEGER,
    "keluarMenit" INTEGER,
    "menitTelat" INTEGER NOT NULL DEFAULT 0,
    "masukLat" DOUBLE PRECISION,
    "masukLng" DOUBLE PRECISION,
    "masukJarakMeter" INTEGER,
    "keluarLat" DOUBLE PRECISION,
    "keluarLng" DOUBLE PRECISION,
    "keluarJarakMeter" INTEGER,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Kasbon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "periode" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kasbon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "gajiPokok" INTEGER NOT NULL DEFAULT 0,
    "tunjangan" INTEGER NOT NULL DEFAULT 0,
    "potonganTelat" INTEGER NOT NULL DEFAULT 0,
    "kasbon" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "role" TEXT NOT NULL,
    "menu" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role", "menu")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_cabangId_aktif_idx" ON "User"("cabangId", "aktif");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "Cabang_nama_key" ON "Cabang"("nama");
CREATE UNIQUE INDEX "Shift_nama_key" ON "Shift"("nama");
CREATE INDEX "Jadwal_tanggal_idx" ON "Jadwal"("tanggal");
CREATE UNIQUE INDEX "Jadwal_userId_tanggal_key" ON "Jadwal"("userId", "tanggal");
CREATE INDEX "Absensi_cabangId_tanggal_idx" ON "Absensi"("cabangId", "tanggal");
CREATE INDEX "Absensi_tanggal_status_idx" ON "Absensi"("tanggal", "status");
CREATE UNIQUE INDEX "Absensi_userId_tanggal_key" ON "Absensi"("userId", "tanggal");
CREATE INDEX "Kasbon_userId_periode_idx" ON "Kasbon"("userId", "periode");
CREATE INDEX "Kasbon_status_idx" ON "Kasbon"("status");
CREATE INDEX "Payroll_periode_idx" ON "Payroll"("periode");
CREATE UNIQUE INDEX "Payroll_userId_periode_key" ON "Payroll"("userId", "periode");

ALTER TABLE "User" ADD CONSTRAINT "User_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Kasbon" ADD CONSTRAINT "Kasbon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

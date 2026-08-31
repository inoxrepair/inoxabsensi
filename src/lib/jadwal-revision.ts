import type { Prisma, PrismaClient } from "@prisma/client";

export type SnapshotJadwal = {
  userIds: string[];
  dates: string[];
  rows: {
    userId: string;
    tanggal: string;
    shiftId: string | null;
    seragamId: string | null;
    seragam: string | null;
  }[];
};

type Db = PrismaClient | Prisma.TransactionClient;

export async function buatRevision(
  db: Db,
  input: {
    adminId: string;
    aksi: string;
    cabangId?: string | null;
    userIds: string[];
    dates: string[];
  },
) {
  const userIds = [...new Set(input.userIds)];
  const dates = [...new Set(input.dates)];
  const rows = await db.jadwal.findMany({
    where: { userId: { in: userIds }, tanggal: { in: dates } },
    select: { userId: true, tanggal: true, shiftId: true, seragamId: true, seragam: true },
  });
  const snapshot: SnapshotJadwal = { userIds, dates, rows };
  return db.jadwalRevision.create({
    data: {
      adminId: input.adminId,
      aksi: input.aksi,
      cabangId: input.cabangId ?? null,
      snapshot: JSON.stringify(snapshot),
    },
  });
}

/** Buat snapshot dari baris yang sudah tersedia di memori transaksi. */
export async function buatRevisionDenganRows(
  db: Db,
  input: {
    adminId: string;
    aksi: string;
    cabangId?: string | null;
    userIds: string[];
    dates: string[];
    rows: SnapshotJadwal["rows"];
  },
) {
  const snapshot: SnapshotJadwal = {
    userIds: [...new Set(input.userIds)],
    dates: [...new Set(input.dates)],
    rows: input.rows,
  };
  return db.jadwalRevision.create({
    data: {
      adminId: input.adminId,
      aksi: input.aksi,
      cabangId: input.cabangId ?? null,
      snapshot: JSON.stringify(snapshot),
    },
  });
}

export function parseSnapshot(value: string): SnapshotJadwal {
  const parsed = JSON.parse(value) as SnapshotJadwal;
  if (!Array.isArray(parsed.userIds) || !Array.isArray(parsed.dates) || !Array.isArray(parsed.rows)) {
    throw new Error("Snapshot jadwal tidak valid.");
  }
  return parsed;
}

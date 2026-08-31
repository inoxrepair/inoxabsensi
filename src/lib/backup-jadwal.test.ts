import { describe, expect, it } from "vitest";
import { backupJadwalSkema } from "./backup-jadwal";

describe("backupJadwalSkema", () => {
  const valid = {
    version: 1,
    dibuatPada: "2026-08-31T00:00:00.000Z",
    dari: "2026-08-01",
    sampai: "2026-08-31",
    data: [
      {
        username: "rizky",
        email: "rizky@inox.co.id",
        tanggal: "2026-08-01",
        shift: "Pagi",
        seragamKode: "SRG-A",
      },
    ],
  } as const;
  it("menerima backup valid", () => {
    expect(backupJadwalSkema.safeParse(valid).success).toBe(true);
  });
  it("menolak versi tidak dikenal", () => {
    expect(backupJadwalSkema.safeParse({ ...valid, version: 2 }).success).toBe(false);
  });
  it("menolak tanggal rusak", () => {
    expect(backupJadwalSkema.safeParse({ ...valid, dari: "2026-02-31" }).success).toBe(false);
  });
});

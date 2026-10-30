import { describe, expect, it } from "vitest";
import {
  ajukanIzinSkema,
  buatIzinAdminSkema,
  bisaDiprosesIzin,
  catatanIzin,
  daftarTanggalIzin,
  prosesIzinSkema,
  rencanaPersetujuanIzin,
} from "./izin";

describe("daftarTanggalIzin", () => {
  it("menghasilkan rentang inklusif", () => {
    expect(daftarTanggalIzin("2026-10-29", "2026-10-31")).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
    ]);
  });
  it("satu hari saja bila dari sama dengan sampai", () => {
    expect(daftarTanggalIzin("2026-10-29", "2026-10-29")).toEqual([
      "2026-10-29",
    ]);
  });
  it("kosong bila rentang terbalik atau tanggal tidak valid", () => {
    expect(daftarTanggalIzin("2026-10-31", "2026-10-29")).toEqual([]);
    expect(daftarTanggalIzin("2026-02-31", "2026-03-01")).toEqual([]);
  });
});

describe("catatanIzin", () => {
  it("memakai awalan jenis", () => {
    expect(catatanIzin("sakit", "demam")).toBe("Sakit: demam");
    expect(catatanIzin("izin", "urusan keluarga")).toBe(
      "Izin: urusan keluarga",
    );
  });
});

describe("validasi pengajuan", () => {
  const dasar = {
    dari: "2026-10-29",
    sampai: "2026-10-30",
    jenis: "sakit" as const,
    alasan: "demam tinggi",
    buktiKeterangan: "surat dokter dikirim via WA",
  };
  it("menerima pengajuan yang sah", () => {
    expect(ajukanIzinSkema.safeParse(dasar).success).toBe(true);
  });
  it("menolak sampai sebelum dari", () => {
    expect(
      ajukanIzinSkema.safeParse({ ...dasar, sampai: "2026-10-28" }).success,
    ).toBe(false);
  });
  it("menolak alasan kosong", () => {
    expect(ajukanIzinSkema.safeParse({ ...dasar, alasan: "  " }).success).toBe(
      false,
    );
  });
  it("menolak rentang lebih dari 30 hari", () => {
    expect(
      ajukanIzinSkema.safeParse({
        ...dasar,
        sampai: "2026-11-29",
      }).success,
    ).toBe(false);
  });
  it("proses hanya menerima disetujui/ditolak", () => {
    expect(
      prosesIzinSkema.safeParse({ id: "x", status: "dibatalkan" }).success,
    ).toBe(false);
    expect(
      prosesIzinSkema.safeParse({ id: "x", status: "disetujui" }).success,
    ).toBe(true);
  });
  it("buat izin admin menolak tanggal tidak valid", () => {
    expect(
      buatIzinAdminSkema.safeParse({
        userId: "u1",
        tanggal: "2026-02-31",
        jenis: "izin",
        alasan: "urusan keluarga",
      }).success,
    ).toBe(false);
  });
});

describe("bisaDiprosesIzin", () => {
  it("hanya pending yang bisa diproses", () => {
    expect(bisaDiprosesIzin("pending")).toBe(true);
    expect(bisaDiprosesIzin("disetujui")).toBe(false);
    expect(bisaDiprosesIzin("ditolak")).toBe(false);
    expect(bisaDiprosesIzin("dibatalkan")).toBe(false);
  });
});

describe("rencanaPersetujuanIzin", () => {
  const jadwal = [
    { tanggal: "2026-10-29", shiftId: "s1", modeShift: "terjadwal", maksimalCycle: 1 },
    { tanggal: "2026-10-30", shiftId: "s1", modeShift: "terjadwal", maksimalCycle: 1 },
    { tanggal: "2026-10-31", shiftId: null, modeShift: null, maksimalCycle: null },
    { tanggal: "2026-11-01", shiftId: "s1", modeShift: "terjadwal", maksimalCycle: 1 },
    { tanggal: "2026-11-02", shiftId: "s1", modeShift: "terjadwal", maksimalCycle: 1 },
  ];
  it("memisahkan dibuat, diubah, dilewati off, dan bentrok", () => {
    const rencana = rencanaPersetujuanIzin(
      ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"],
      jadwal,
      [
        { tanggal: "2026-10-30", status: "alpa" },
        { tanggal: "2026-11-01", status: "hadir" },
        { tanggal: "2026-11-02", status: "telat" },
      ],
    );
    expect(rencana.dibuat).toEqual(["2026-10-29"]);
    expect(rencana.diubah).toEqual(["2026-10-30"]);
    expect(rencana.dilewatiOff).toEqual(["2026-10-31"]);
    expect(rencana.bentrok).toEqual(["2026-11-01", "2026-11-02"]);
  });
  it("tanggal tanpa baris jadwal dianggap off", () => {
    const rencana = rencanaPersetujuanIzin(["2026-12-01"], [], []);
    expect(rencana.dilewatiOff).toEqual(["2026-12-01"]);
  });
});

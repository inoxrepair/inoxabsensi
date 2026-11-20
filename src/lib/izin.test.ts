import { describe, expect, it } from "vitest";
import {
  ajukanIzinSkema,
  buatIzinAdminSkema,
  bisaDiprosesIzin,
  catatanIzin,
  catatanIzinTelat,
  catatanPulangCepat,
  daftarTanggalIzin,
  hariDalamTahun,
  LABEL_JENIS_IZIN,
  perluBarisAbsensi,
  prosesIzinSkema,
  rencanaPersetujuanIzin,
  sisaCuti,
  statusBarisDisetujui,
  tambahCatatan,
  tahunRentang,
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

describe("jenis baru", () => {
  it("label jenis baru terisi", () => {
    expect(LABEL_JENIS_IZIN["telat"]).toBe("Izin telat");
    expect(LABEL_JENIS_IZIN["cuti"]).toBe("Cuti");
    expect(LABEL_JENIS_IZIN["dinas"]).toBe("Dinas luar");
    expect(LABEL_JENIS_IZIN["pulang-cepat"]).toBe("Izin pulang cepat");
  });
  it("dinas membuat baris hadir, telat/pulang-cepat tidak membuat baris", () => {
    expect(statusBarisDisetujui("dinas")).toBe("hadir");
    expect(statusBarisDisetujui("izin")).toBe("izin");
    expect(statusBarisDisetujui("cuti")).toBe("izin");
    expect(perluBarisAbsensi("telat")).toBe(false);
    expect(perluBarisAbsensi("pulang-cepat")).toBe(false);
    expect(perluBarisAbsensi("dinas")).toBe(true);
  });
  it("catatanIzin memakai awalan jenis baru", () => {
    expect(catatanIzin("cuti", "liburan")).toBe("Cuti: liburan");
    expect(catatanIzin("dinas", "antar barang")).toBe(
      "Dinas luar: antar barang",
    );
  });
});

describe("validasi pengajuan jenis baru", () => {
  const dasarTelat = {
    dari: "2026-11-23",
    sampai: "2026-11-23",
    jenis: "telat" as const,
    alasan: "motor mogok",
    jamMasukDiizinkan: "10.00",
  };
  it("izin telat sah bila satu hari + jam terisi, jam diubah jadi menit", () => {
    const hasil = ajukanIzinSkema.safeParse(dasarTelat);
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.jamMasukDiizinkan).toBe(600);
  });
  it("izin telat ditolak bila tanpa jam", () => {
    expect(
      ajukanIzinSkema.safeParse({
        ...dasarTelat,
        jamMasukDiizinkan: undefined,
      }).success,
    ).toBe(false);
  });
  it("izin telat ditolak bila lebih dari satu hari", () => {
    expect(
      ajukanIzinSkema.safeParse({ ...dasarTelat, sampai: "2026-11-24" })
        .success,
    ).toBe(false);
  });
  it("izin pulang cepat sah bila satu hari + jam terisi", () => {
    const hasil = ajukanIzinSkema.safeParse({
      dari: "2026-11-23",
      sampai: "2026-11-23",
      jenis: "pulang-cepat" as const,
      alasan: "antar anak",
      jamPulangDiizinkan: "15:00",
    });
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.jamPulangDiizinkan).toBe(900);
  });
  it("cuti sah untuk rentang beberapa hari", () => {
    expect(
      ajukanIzinSkema.safeParse({
        dari: "2026-12-24",
        sampai: "2026-12-26",
        jenis: "cuti" as const,
        alasan: "liburan",
      }).success,
    ).toBe(true);
  });
  it("buat izin admin telat butuh jam", () => {
    expect(
      buatIzinAdminSkema.safeParse({
        userId: "u1",
        tanggal: "2026-11-23",
        jenis: "telat",
        alasan: "motor mogok",
      }).success,
    ).toBe(false);
    const hasil = buatIzinAdminSkema.safeParse({
      userId: "u1",
      tanggal: "2026-11-23",
      jenis: "telat",
      alasan: "motor mogok",
      jamMasukDiizinkan: "10.00",
    });
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.jamMasukDiizinkan).toBe(600);
  });
});

describe("saldo cuti", () => {
  it("jatah 12 hari dikurangi cuti yang disetujui di tahun itu", () => {
    expect(sisaCuti(2026, [])).toBe(12);
    expect(
      sisaCuti(2026, [{ dari: "2026-12-24", sampai: "2026-12-26" }]),
    ).toBe(9);
    // Cuti tahun lain tidak mengurangi saldo tahun ini.
    expect(
      sisaCuti(2026, [{ dari: "2025-12-24", sampai: "2025-12-26" }]),
    ).toBe(12);
    // Rentang melewati tahun baru dihitung per tahun.
    expect(hariDalamTahun("2026-12-30", "2027-01-02", 2026)).toBe(2);
    expect(hariDalamTahun("2026-12-30", "2027-01-02", 2027)).toBe(2);
    expect(tahunRentang("2026-12-30", "2027-01-02")).toEqual([2026, 2027]);
    expect(tahunRentang("2026-11-23", "2026-11-25")).toEqual([2026]);
  });
  it("saldo tidak pernah negatif", () => {
    expect(sisaCuti(2026, [{ dari: "2026-01-01", sampai: "2026-01-20" }])).toBe(
      0,
    );
  });
});

describe("catatan izin telat/pulang cepat", () => {
  it("format jam memakai keJam", () => {
    expect(catatanIzinTelat(600)).toBe("Izin telat s.d. 10.00");
    expect(catatanPulangCepat(900)).toBe("Izin pulang cepat mulai 15.00");
  });
  it("tambahCatatan menggabung tanpa duplikat", () => {
    expect(tambahCatatan(null, "Izin telat s.d. 10.00")).toBe(
      "Izin telat s.d. 10.00",
    );
    expect(
      tambahCatatan("Izin telat s.d. 10.00", "Izin telat s.d. 10.00"),
    ).toBe("Izin telat s.d. 10.00");
    expect(
      tambahCatatan("Dinas luar: antar barang", "Izin telat s.d. 10.00"),
    ).toBe("Dinas luar: antar barang · Izin telat s.d. 10.00");
  });
});

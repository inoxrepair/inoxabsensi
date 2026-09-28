import { describe, expect, it } from "vitest";
import {
  awalMinggu,
  durasiMenit,
  formatDurasi,
  indeksHari,
  keJam,
  keMenit,
  menitTelat,
  toleransiTerpakai,
  namaHari,
  selisihHari,
  tanggalGeser,
  tanggalLokal,
  menitLokal,
} from "./waktu";

describe("keMenit", () => {
  it("menerima pemisah titik dan titik dua", () => {
    expect(keMenit("09.00")).toBe(540);
    expect(keMenit("09:00")).toBe(540);
    expect(keMenit("9.05")).toBe(545);
    expect(keMenit(" 22.30 ")).toBe(1350);
  });

  it("menolak format tidak valid", () => {
    for (const buruk of ["", "9", "24.00", "09.60", "abc", "09.5"]) {
      expect(keMenit(buruk)).toBeNull();
    }
  });
});

describe("keJam", () => {
  it("mengembalikan format dua digit", () => {
    expect(keJam(0)).toBe("00.00");
    expect(keJam(540)).toBe("09.00");
    expect(keJam(1350)).toBe("22.30");
  });

  it("membungkus nilai di luar satu hari", () => {
    expect(keJam(1440)).toBe("00.00");
    expect(keJam(1500)).toBe("01.00");
    expect(keJam(-60)).toBe("23.00");
  });

  it("bolak-balik dengan keMenit", () => {
    for (const jam of ["00.00", "09.00", "13.45", "23.59"]) {
      expect(keJam(keMenit(jam)!)).toBe(jam);
    }
  });
});

describe("durasiMenit", () => {
  it("shift dalam hari yang sama", () => {
    expect(durasiMenit(540, 1020)).toBe(480);
  });

  it("shift melewati tengah malam", () => {
    expect(durasiMenit(1320, 240)).toBe(360);
  });
});

describe("formatDurasi", () => {
  it("menyembunyikan menit saat bulat", () => {
    expect(formatDurasi(480)).toBe("8j");
    expect(formatDurasi(495)).toBe("8j 15m");
  });
});

describe("menitTelat", () => {
  const shift = { mulaiMenit: 540, toleransiMenit: 10 };

  it("nol saat datang lebih awal atau dalam toleransi", () => {
    expect(menitTelat(520, shift)).toBe(0);
    expect(menitTelat(550, shift)).toBe(0);
  });

  it("menghitung selisih setelah toleransi", () => {
    expect(menitTelat(565, shift)).toBe(15);
  });
});

describe("toleransiTerpakai", () => {
  const shift = { mulaiMenit: 480, toleransiMenit: 10 };

  it("nol bila datang tepat waktu atau lebih awal", () => {
    expect(toleransiTerpakai(480, shift)).toBe(0);
    expect(toleransiTerpakai(475, shift)).toBe(0);
  });

  it("menghitung menit kotor di dalam toleransi", () => {
    expect(toleransiTerpakai(487, shift)).toBe(7);
  });

  it("mentok di batas toleransi bila sudah telat", () => {
    expect(toleransiTerpakai(490, shift)).toBe(10);
    expect(toleransiTerpakai(492, shift)).toBe(10);
  });
});

describe("waktu lokal", () => {
  it("tanggalLokal memakai format yyyy-mm-dd", () => {
    expect(tanggalLokal(new Date("2026-08-30T12:00:00Z"))).toBe("2026-08-30");
  });

  it("tengah malam UTC sudah hari berikutnya di WITA (+08)", () => {
    expect(tanggalLokal(new Date("2026-08-30T17:00:00Z"))).toBe("2026-08-31");
    expect(menitLokal(new Date("2026-08-30T17:00:00Z"))).toBe(60);
  });
});

describe("aritmetika tanggal", () => {
  it("tanggalGeser melewati batas bulan", () => {
    expect(tanggalGeser("2026-08-31", 1)).toBe("2026-09-01");
    expect(tanggalGeser("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("tanggalGeser melewati batas tahun", () => {
    expect(tanggalGeser("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("menangani tahun kabisat", () => {
    expect(tanggalGeser("2028-02-28", 1)).toBe("2028-02-29");
    expect(selisihHari("2028-02-01", "2028-03-01")).toBe(29);
  });

  it("indeksHari: Senin = 0, Minggu = 6", () => {
    // 2026-08-31 adalah hari Senin.
    expect(indeksHari("2026-08-31")).toBe(0);
    expect(indeksHari("2026-09-06")).toBe(6);
  });

  it("awalMinggu selalu mundur ke Senin", () => {
    expect(awalMinggu("2026-09-02")).toBe("2026-08-31");
    expect(awalMinggu("2026-08-31")).toBe("2026-08-31");
    // Minggu ikut minggu yang sama, bukan minggu berikutnya.
    expect(awalMinggu("2026-09-06")).toBe("2026-08-31");
  });

  it("selisihHari simetris dengan tanda", () => {
    expect(selisihHari("2026-08-30", "2026-09-02")).toBe(3);
    expect(selisihHari("2026-09-02", "2026-08-30")).toBe(-3);
  });

  it("namaHari mengembalikan label Indonesia", () => {
    expect(namaHari("2026-08-31")).toBe("Senin");
    expect(namaHari("2026-08-31", true)).toBe("Sen");
  });
});

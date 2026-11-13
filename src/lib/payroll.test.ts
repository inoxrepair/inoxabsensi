import { describe, expect, it } from "vitest";
import {
  dihitungHadir,
  durasiShiftMenit,
  jamDibulatkan,
  jamLembur,
  melebihiPendapatan,
  menitKerjaCycle,
  menitLembur,
  payrollSkema,
  potonganTelat,
  RUPIAH_MAKS,
  takeHomePay,
  TARIF_LEMBUR_PER_JAM,
  TARIF_PER_JAM,
  TARIF_POTONGAN_TELAT_PER_MENIT,
  TARIF_TUNJANGAN_MAKAN_PER_HARI,
  totalPayroll,
  tunjanganMakan,
  upahLembur,
  upahPerJam,
} from "./payroll";

function form(ubah: Record<string, string> = {}) {
  return {
    userId: "u1",
    periode: "2026-08",
    gajiPokok: "3500000",
    tunjangan: "400000",
    potonganTelat: "50000",
    kasbon: "500000",
    ...ubah,
  };
}

function galat(ubah: Record<string, string>) {
  const h = payrollSkema.safeParse(form(ubah));
  return h.success ? null : h.error.issues[0].message;
}

describe("payrollSkema", () => {
  it("menerima data valid", () => {
    const h = payrollSkema.safeParse(form());
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data.gajiPokok).toBe(3_500_000);
      expect(h.data.kasbon).toBe(500_000);
    }
  });

  it("menerima angka berformat titik ribuan", () => {
    const h = payrollSkema.safeParse(form({ gajiPokok: "3.500.000" }));
    if (h.success) expect(h.data.gajiPokok).toBe(3_500_000);
  });

  it("string kosong dianggap nol", () => {
    const h = payrollSkema.safeParse(form({ tunjangan: "" }));
    expect(h.success).toBe(true);
    if (h.success) expect(h.data.tunjangan).toBe(0);
  });

  it("nol diperbolehkan di semua komponen", () => {
    const h = payrollSkema.safeParse(
      form({ gajiPokok: "0", tunjangan: "0", potonganTelat: "0", kasbon: "0" }),
    );
    expect(h.success).toBe(true);
  });

  it("menolak nilai negatif", () => {
    expect(galat({ gajiPokok: "-1" })).toMatch(/tidak boleh negatif/);
  });

  it("menolak desimal", () => {
    expect(galat({ tunjangan: "1000,5" })).toBeTruthy();
    expect(galat({ tunjangan: "1000.5" })).toBeTruthy();
  });

  it("menolak bukan angka", () => {
    expect(galat({ kasbon: "abc" })).toBeTruthy();
  });

  it("menolak nilai melebihi batas wajar", () => {
    expect(galat({ gajiPokok: String(RUPIAH_MAKS + 1) })).toMatch(
      /melebihi batas wajar/,
    );
  });

  it("menolak periode tidak valid", () => {
    expect(galat({ periode: "2026-8" })).toMatch(/Periode tidak valid/);
    expect(galat({ periode: "2026-13" })).toMatch(/Periode tidak valid/);
    expect(galat({ periode: "Agustus" })).toMatch(/Periode tidak valid/);
  });

  it("mengabaikan kunci insentif: sumbernya hanya tabel Insentif hasil sinkron", () => {
    const h = payrollSkema.safeParse(form({ insentif: "999999" } as any));
    expect(h.success).toBe(true);
    if (h.success) {
      expect("insentif" in h.data).toBe(false);
    }
  });

  it("mengabaikan kunci tunjangan makan: dihitung otomatis dari hari hadir", () => {
    const h = payrollSkema.safeParse(form({ tunjanganMakan: "999999" } as any));
    expect(h.success).toBe(true);
    if (h.success) {
      expect("tunjanganMakan" in h.data).toBe(false);
    }
  });

  it("mengabaikan kunci potongan telat: dihitung otomatis dari menit telat", () => {
    const h = payrollSkema.safeParse(form({ potonganTelat: "999999" } as any));
    expect(h.success).toBe(true);
    if (h.success) {
      expect("potonganTelat" in h.data).toBe(false);
    }
  });

  it("mengabaikan kunci lembur: dihitung otomatis dari shift terjadwal", () => {
    const h = payrollSkema.safeParse(form({ lembur: "999999" } as any));
    expect(h.success).toBe(true);
    if (h.success) {
      expect("lembur" in h.data).toBe(false);
    }
  });

  it("mengabaikan kunci gaji pokok fleksibel: dihitung otomatis dari jam kerja", () => {
    const h = payrollSkema.safeParse(form({ gajiPokokFleksibel: "999999" } as any));
    expect(h.success).toBe(true);
    if (h.success) {
      expect("gajiPokokFleksibel" in h.data).toBe(false);
    }
  });
});

describe("takeHomePay", () => {
  it("menjumlahkan pendapatan dikurangi potongan", () => {
    expect(
      takeHomePay({
        gajiPokok: 3_500_000,
        tunjangan: 400_000,
        tunjanganMakan: 0,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 50_000,
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(3_350_000);
  });

  it("menambahkan tunjangan makan ke pendapatan", () => {
    expect(
      takeHomePay({
        gajiPokok: 3_500_000,
        tunjangan: 400_000,
        tunjanganMakan: 440_000,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 50_000,
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(3_790_000);
  });

  it("mengurangi potongan telat hasil hitungan (15 menit × Rp 1.000)", () => {
    expect(
      takeHomePay({
        gajiPokok: 3_500_000,
        tunjangan: 400_000,
        tunjanganMakan: 440_000,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: potonganTelat(15),
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(3_825_000);
  });

  it("bisa negatif bila potongan melebihi pendapatan", () => {
    expect(
      takeHomePay({
        gajiPokok: 100_000,
        tunjangan: 0,
        tunjanganMakan: 0,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 0,
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(-400_000);
  });

  it("menambahkan lembur ke pendapatan (5 jam × Rp 12.000)", () => {
    expect(
      takeHomePay({
        gajiPokok: 3_500_000,
        tunjangan: 400_000,
        tunjanganMakan: 440_000,
        lembur: 60_000,
        gajiPokokFleksibel: 0,
        potonganTelat: 50_000,
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(3_850_000);
  });

  it("semua nol menghasilkan nol", () => {
    expect(
      takeHomePay({
        gajiPokok: 0,
        tunjangan: 0,
        tunjanganMakan: 0,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 0,
        kasbon: 0,
        insentif: 0,
      }),
    ).toBe(0);
  });
});

describe("melebihiPendapatan", () => {
  it("mendeteksi potongan lebih besar dari pendapatan", () => {
    expect(
      melebihiPendapatan({
        gajiPokok: 1_000_000,
        tunjangan: 0,
        tunjanganMakan: 0,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 600_000,
        kasbon: 600_000,
        insentif: 0,
      }),
    ).toBe(true);
  });

  it("tepat sama tidak dianggap melebihi", () => {
    expect(
      melebihiPendapatan({
        gajiPokok: 1_000_000,
        tunjangan: 0,
        tunjanganMakan: 0,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 500_000,
        kasbon: 500_000,
        insentif: 0,
      }),
    ).toBe(false);
  });

  it("tunjangan makan dihitung sebagai pendapatan", () => {
    expect(
      melebihiPendapatan({
        gajiPokok: 0,
        tunjangan: 0,
        tunjanganMakan: 440_000,
        lembur: 0,
        gajiPokokFleksibel: 0,
        potonganTelat: 100_000,
        kasbon: 0,
        insentif: 0,
      }),
    ).toBe(false);
  });
});

describe("totalPayroll", () => {
  it("menjumlahkan seluruh komponen dan gaji diterima", () => {
    const t = totalPayroll([
      { gajiPokok: 1_000_000, tunjangan: 100_000, tunjanganMakan: 0, lembur: 0, gajiPokokFleksibel: 0, potonganTelat: 0, kasbon: 0, insentif: 0 },
      {
        gajiPokok: 2_000_000,
        tunjangan: 200_000,
        tunjanganMakan: 400_000,
        lembur: 60_000,
        gajiPokokFleksibel: 120_000,
        potonganTelat: 50_000,
        kasbon: 100_000,
        insentif: 0,
      },
    ]);
    expect(t.gajiPokok).toBe(3_000_000);
    expect(t.tunjangan).toBe(300_000);
    expect(t.tunjanganMakan).toBe(400_000);
    expect(t.lembur).toBe(60_000);
    expect(t.gajiPokokFleksibel).toBe(120_000);
    expect(t.potonganTelat).toBe(50_000);
    expect(t.kasbon).toBe(100_000);
    expect(t.diterima).toBe(3_730_000);
  });

  it("array kosong menghasilkan nol semua", () => {
    expect(totalPayroll([])).toEqual({
      gajiPokok: 0,
      tunjangan: 0,
      tunjanganMakan: 0,
      lembur: 0,
      gajiPokokFleksibel: 0,
      potonganTelat: 0,
      kasbon: 0,
      insentif: 0,
      diterima: 0,
    });
  });
});

describe("tunjanganMakan", () => {
  it("tarif Rp 20.000 per hari hadir", () => {
    expect(TARIF_TUNJANGAN_MAKAN_PER_HARI).toBe(20_000);
    expect(tunjanganMakan(22)).toBe(440_000);
  });

  it("nol hari menghasilkan nol", () => {
    expect(tunjanganMakan(0)).toBe(0);
  });

  it("nilai negatif dijaga nol, pecahan dibulatkan ke bawah", () => {
    expect(tunjanganMakan(-3)).toBe(0);
    expect(tunjanganMakan(2.9)).toBe(40_000);
  });
});

describe("potonganTelat", () => {
  it("tarif Rp 1.000 per menit telat tercatat", () => {
    expect(TARIF_POTONGAN_TELAT_PER_MENIT).toBe(1_000);
    expect(potonganTelat(15)).toBe(15_000);
  });

  it("nol menit menghasilkan nol", () => {
    expect(potonganTelat(0)).toBe(0);
  });

  it("nilai negatif dijaga nol, pecahan dibulatkan ke bawah", () => {
    expect(potonganTelat(-5)).toBe(0);
    expect(potonganTelat(2.9)).toBe(2_000);
  });
});

describe("lembur", () => {
  it("tarif Rp 12.000 per jam", () => {
    expect(TARIF_LEMBUR_PER_JAM).toBe(12_000);
    expect(upahLembur(5)).toBe(60_000);
    expect(upahLembur(0)).toBe(0);
  });

  it("durasi shift dihitung dari jam mulai–selesai, memutar bila lewat tengah malam", () => {
    expect(durasiShiftMenit(510, 1320)).toBe(810); // 08.30–22.00 = 13,5 jam
    expect(durasiShiftMenit(1200, 360)).toBe(600); // 20.00–06.00 = 10 jam
  });

  it("menit lembur = durasi shift terjadwal di atas 8 jam", () => {
    expect(menitLembur(510, 1320, "terjadwal")).toBe(330); // 08.30–22.00
    expect(menitLembur(480, 960, "terjadwal")).toBe(0); // 08.00–16.00 = 8 jam pas
    expect(menitLembur(480, 1020, "terjadwal")).toBe(60); // 08.00–17.00 = 9 jam
  });

  it("shift fleksibel tidak dihitung lembur", () => {
    expect(menitLembur(510, 1320, "fleksibel")).toBe(0);
  });

  it("pembulatan per hari: sisa 30 menit atau lebih dibulatkan ke atas, dimulai dari 30 menit", () => {
    expect(jamLembur(0)).toBe(0);
    expect(jamLembur(29)).toBe(0);
    expect(jamLembur(30)).toBe(1);
    expect(jamLembur(31)).toBe(1);
    expect(jamLembur(90)).toBe(2);
    expect(jamLembur(91)).toBe(2);
    expect(jamLembur(330)).toBe(6); // 5 jam 30 menit contoh 08.30–22.00
    expect(jamLembur(331)).toBe(6);
  });

  it("nilai negatif dijaga nol", () => {
    expect(jamLembur(-10)).toBe(0);
    expect(upahLembur(-2)).toBe(0);
  });
});

describe("gaji pokok fleksibel", () => {
  it("pembulatan jam dibulatkan: 7 jam 30 menit jadi 8 jam", () => {
    expect(jamDibulatkan(450)).toBe(8); // contoh Ucok: 7 jam 30 menit
    expect(jamDibulatkan(0)).toBe(0);
    expect(jamDibulatkan(29)).toBe(0);
    expect(jamDibulatkan(30)).toBe(1);
    expect(jamDibulatkan(89)).toBe(1);
    expect(jamDibulatkan(90)).toBe(2);
  });

  it("tarif per jam Rp 12.000, sama dengan tarif lembur", () => {
    expect(TARIF_PER_JAM).toBe(12_000);
    expect(TARIF_LEMBUR_PER_JAM).toBe(TARIF_PER_JAM);
    expect(upahPerJam(8)).toBe(96_000);
    expect(upahPerJam(0)).toBe(0);
  });

  it("menit kerja satu hari = jumlah semua cycle (1–3 cycle)", () => {
    // 1 cycle: 08.30–16.00 = 7,5 jam.
    expect(menitKerjaCycle([{ masukMenit: 510, keluarMenit: 960 }])).toBe(450);
    // 2 cycle: 08.00–12.00 + 13.00–17.30 = 4 + 4,5 jam.
    expect(
      menitKerjaCycle([
        { masukMenit: 480, keluarMenit: 720 },
        { masukMenit: 780, keluarMenit: 1050 },
      ]),
    ).toBe(510);
    // 3 cycle + 1 cycle belum check-out (dilewati).
    expect(
      menitKerjaCycle([
        { masukMenit: 480, keluarMenit: 600 },
        { masukMenit: 660, keluarMenit: 780 },
        { masukMenit: 840, keluarMenit: 960 },
        { masukMenit: 1020, keluarMenit: null },
      ]),
    ).toBe(360);
    expect(menitKerjaCycle([])).toBe(0);
  });

  it("takeHomePay menambahkan gaji pokok fleksibel (96 jam × Rp 12.000)", () => {
    expect(
      takeHomePay({
        gajiPokok: 0,
        gajiPokokFleksibel: 1_152_000,
        tunjangan: 0,
        tunjanganMakan: 360_000, // 18 hari hadir
        lembur: 0,
        potonganTelat: 0,
        kasbon: 0,
        insentif: 0,
      }),
    ).toBe(1_512_000);
  });
});

describe("dihitungHadir", () => {
  it("hadir dan telat dihitung", () => {
    expect(dihitungHadir("hadir")).toBe(true);
    expect(dihitungHadir("telat")).toBe(true);
  });

  it("alpa, izin, libur, dan status asing tidak dihitung", () => {
    expect(dihitungHadir("alpa")).toBe(false);
    expect(dihitungHadir("izin")).toBe(false);
    expect(dihitungHadir("libur")).toBe(false);
    expect(dihitungHadir("lainnya")).toBe(false);
  });
});

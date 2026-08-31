import { describe, expect, it } from "vitest";
import {
  melebihiPendapatan,
  payrollSkema,
  RUPIAH_MAKS,
  takeHomePay,
  totalPayroll,
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
});

describe("takeHomePay", () => {
  it("menjumlahkan pendapatan dikurangi potongan", () => {
    expect(
      takeHomePay({
        gajiPokok: 3_500_000,
        tunjangan: 400_000,
        potonganTelat: 50_000,
        kasbon: 500_000,
      }),
    ).toBe(3_350_000);
  });

  it("bisa negatif bila potongan melebihi pendapatan", () => {
    expect(
      takeHomePay({
        gajiPokok: 100_000,
        tunjangan: 0,
        potonganTelat: 0,
        kasbon: 500_000,
      }),
    ).toBe(-400_000);
  });

  it("semua nol menghasilkan nol", () => {
    expect(
      takeHomePay({
        gajiPokok: 0,
        tunjangan: 0,
        potonganTelat: 0,
        kasbon: 0,
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
        potonganTelat: 600_000,
        kasbon: 600_000,
      }),
    ).toBe(true);
  });

  it("tepat sama tidak dianggap melebihi", () => {
    expect(
      melebihiPendapatan({
        gajiPokok: 1_000_000,
        tunjangan: 0,
        potonganTelat: 500_000,
        kasbon: 500_000,
      }),
    ).toBe(false);
  });
});

describe("totalPayroll", () => {
  it("menjumlahkan seluruh komponen dan gaji diterima", () => {
    const t = totalPayroll([
      { gajiPokok: 1_000_000, tunjangan: 100_000, potonganTelat: 0, kasbon: 0 },
      {
        gajiPokok: 2_000_000,
        tunjangan: 200_000,
        potonganTelat: 50_000,
        kasbon: 100_000,
      },
    ]);
    expect(t.gajiPokok).toBe(3_000_000);
    expect(t.tunjangan).toBe(300_000);
    expect(t.potonganTelat).toBe(50_000);
    expect(t.kasbon).toBe(100_000);
    expect(t.diterima).toBe(3_150_000);
  });

  it("array kosong menghasilkan nol semua", () => {
    expect(totalPayroll([])).toEqual({
      gajiPokok: 0,
      tunjangan: 0,
      potonganTelat: 0,
      kasbon: 0,
      diterima: 0,
    });
  });
});

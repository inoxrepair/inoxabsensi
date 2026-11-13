import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buatPayrollPdf, buatSlipPayrollPdf } from "./payroll-pdf";
import { totalPayroll, type BarisPayroll } from "./payroll";

function barisContoh(nama: string, cabang: string): BarisPayroll {
  return {
    userId: `u-${nama}`,
    nama,
    cabang,
    gajiPokok: 3500000,
    tunjangan: 500000,
    hariHadir: 22,
    tunjanganMakan: 440000,
    potonganTelat: 15000,
    kasbon: 200000,
    insentif: 685000,
    menitTelatRekap: 15,
    kasbonDisetujuiSisa: 200000,
  };
}

const DATA = {
  periode: "2026-11",
  rentang: { dari: "2026-10-28", sampai: "2026-11-27" },
  jendelaKustom: false,
  jendela: { dari: "2026-10-28", sampai: "2026-11-27" },
  cabang: null as string | null,
  baris: [
    barisContoh("Fajri Mokodompit", "KWSN"),
    barisContoh("Raffa Ahmad", "KWSN"),
  ],
};

describe("buatPayrollPdf", () => {
  it("menghasilkan file PDF valid", async () => {
    const bytes = await buatPayrollPdf({
      ...DATA,
      total: totalPayroll(DATA.baris),
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("tetap valid bila tidak ada karyawan", async () => {
    const bytes = await buatPayrollPdf({
      ...DATA,
      baris: [],
      total: totalPayroll([]),
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("membagi ke beberapa halaman bila karyawan banyak", async () => {
    const baris = Array.from({ length: 40 }, (_, i) =>
      barisContoh(`Karyawan ${i + 1}`, "KWSN"),
    );
    const bytes = await buatPayrollPdf({
      ...DATA,
      baris,
      total: totalPayroll(baris),
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});

describe("buatSlipPayrollPdf", () => {
  it("menghasilkan slip satu halaman yang valid", async () => {
    const bytes = await buatSlipPayrollPdf({
      periode: "2026-11",
      rentang: { dari: "2026-10-28", sampai: "2026-11-27" },
      jendelaKustom: false,
      jendela: { dari: "2026-10-28", sampai: "2026-11-27" },
      perusahaan: "iNOX Repair",
      baris: barisContoh("Fajri Mokodompit", "KWSN"),
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});

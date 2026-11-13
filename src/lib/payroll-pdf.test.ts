import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buatPayrollPdf, buatSlipPayrollPdf } from "./payroll-pdf";
import type { BarisLogSlip } from "./log-absensi-slip";
import { totalPayroll, type BarisPayroll } from "./payroll";

function barisContoh(nama: string, cabang: string): BarisPayroll {
  return {
    userId: `u-${nama}`,
    nama,
    cabang,
    gajiPokok: 3500000,
    gajiPokokFleksibel: 0,
    tunjangan: 500000,
    hariHadir: 22,
    tunjanganMakan: 440000,
    lembur: 60000,
    jamLembur: 5,
    jamFleksibel: 0,
    potonganTelat: 15000,
    kasbon: 200000,
    insentif: 685000,
    menitTelatRekap: 15,
    kasbonDisetujuiSisa: 200000,
    insentifTransaksi: 27,
  };
}

function logContoh(): BarisLogSlip[] {
  return [
    {
      tanggal: "2026-11-02",
      keadaan: "hadir",
      shiftNama: "Pagi",
      shiftJam: "08.30–16.30",
      masukMenit: 511,
      keluarMenit: 995,
      menitKerja: 484,
      menitTelat: 0,
      cabang: "KWSN",
    },
    {
      tanggal: "2026-11-03",
      keadaan: "telat",
      shiftNama: "Pagi",
      shiftJam: "08.30–16.30",
      masukMenit: 525,
      keluarMenit: 990,
      menitKerja: 465,
      menitTelat: 5,
      cabang: "KWSN",
    },
    {
      tanggal: "2026-11-04",
      keadaan: "alpa",
      shiftNama: "Pagi",
      shiftJam: "08.30–16.30",
      masukMenit: null,
      keluarMenit: null,
      menitKerja: null,
      menitTelat: 0,
      cabang: null,
    },
  ];
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
  it("tetap valid dengan karyawan fleksibel (baris gaji pokok fleksibel di slip)", async () => {
    const fleksibel: BarisPayroll = {
      ...barisContoh("Dedi Saputra", "KWSN"),
      gajiPokok: 0,
      gajiPokokFleksibel: 1152000, // 96 jam × Rp 12.000
      jamFleksibel: 96,
      tunjangan: 0,
      hariHadir: 18,
      tunjanganMakan: 360000,
      lembur: 0,
      jamLembur: 0,
      potonganTelat: 0,
      kasbon: 0,
      insentif: 0,
      menitTelatRekap: 0,
      kasbonDisetujuiSisa: 0,
      insentifTransaksi: 0,
    };
    const rekap = await buatPayrollPdf({
      ...DATA,
      baris: [fleksibel],
      total: totalPayroll([fleksibel]),
    });
    expect(new TextDecoder().decode(rekap.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(rekap)).getPageCount()).toBe(1);
    const slip = await buatSlipPayrollPdf({
      periode: "2026-11",
      rentang: { dari: "2026-10-28", sampai: "2026-11-27" },
      jendelaKustom: false,
      jendela: { dari: "2026-10-28", sampai: "2026-11-27" },
      perusahaan: "iNOX Repair",
      baris: fleksibel,
      log: logContoh(),
    });
    expect(new TextDecoder().decode(slip.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(slip)).getPageCount()).toBe(2);
  });
});

describe("buatSlipPayrollPdf", () => {
  it("menghasilkan slip dua halaman (rincian + log absensi) yang valid", async () => {
    const bytes = await buatSlipPayrollPdf({
      periode: "2026-11",
      rentang: { dari: "2026-10-28", sampai: "2026-11-27" },
      jendelaKustom: false,
      jendela: { dari: "2026-10-28", sampai: "2026-11-27" },
      perusahaan: "iNOX Repair",
      baris: barisContoh("Fajri Mokodompit", "KWSN"),
      log: logContoh(),
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });

  it("tetap dua halaman bila log kosong", async () => {
    const bytes = await buatSlipPayrollPdf({
      periode: "2026-11",
      rentang: { dari: "2026-10-28", sampai: "2026-11-27" },
      jendelaKustom: false,
      jendela: { dari: "2026-10-28", sampai: "2026-11-27" },
      perusahaan: "iNOX Repair",
      baris: barisContoh("Fajri Mokodompit", "KWSN"),
      log: [],
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });
});

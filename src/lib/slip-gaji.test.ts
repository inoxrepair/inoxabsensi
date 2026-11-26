import { describe, expect, it } from "vitest";
import { takeHomePay, type BarisPayroll } from "@/lib/payroll";
import {
  bacaStatusSlip,
  gabungkanBarisSlip,
  infoSlipPdf,
  komponenDariSnapshot,
  LABEL_STATUS_SLIP,
  snapshotDariBaris,
  STATUS_SLIP,
  statusSlip,
  terapkanTunjanganMakanDinamis,
  type SlipGaji,
} from "@/lib/slip-gaji";

function barisPayroll(
  ubah: Partial<BarisPayroll> = {},
): BarisPayroll {
  return {
    userId: "u-1",
    nama: "Budi",
    cabang: "KWSN",
    gajiPokok: 2_000_000,
    gajiPokokFleksibel: 0,
    gajiPokokHarian: 0,
    tunjangan: 500_000,
    tunjanganMakan: 400_000,
    lembur: 120_000,
    potonganTelat: 15_000,
    kasbon: 100_000,
    penyesuaian: 0,
    keteranganPenyesuaian: null,
    insentif: 300_000,
    hariHadir: 20,
    menitTelatRekap: 15,
    jamLembur: 10,
    jamFleksibel: 0,
    hariShiftBiasa: 0,
    jamShiftBiasa: 0,
    kasbonSisa: 100_000,
    insentifTransaksi: 12,
    ...ubah,
  };
}

function slip(
  ubah: Partial<SlipGaji> = {},
): SlipGaji {
  return {
    id: "s-1",
    userId: "u-1",
    nama: "Budi",
    periode: "2026-11",
    gajiPokok: 2_000_000,
    gajiPokokFleksibel: 0,
    gajiPokokHarian: 0,
    tunjangan: 500_000,
    tunjanganMakan: 400_000,
    lembur: 120_000,
    insentif: 300_000,
    potonganTelat: 15_000,
    kasbon: 100_000,
    penyesuaian: 0,
    keteranganPenyesuaian: null,
    diterima: 3_205_000,
    status: "dibuat",
    dibuatOleh: "admin-1",
    dibuatPada: new Date("2026-11-17T10:00:00.000Z"),
    dibayarOleh: null,
    dibayarPada: null,
    cabangNama: "KWSN",
    ...ubah,
  };
}

describe("statusSlip", () => {
  it("belum ada snapshot = Belum dibuat", () => {
    expect(statusSlip(null)).toBe("belum");
  });

  it("snapshot tanpa tanggal bayar = Sudah dibuat", () => {
    expect(statusSlip({ dibayarPada: null })).toBe("dibuat");
  });

  it("snapshot dengan tanggal bayar = Sudah dibayar", () => {
    expect(statusSlip({ dibayarPada: new Date() })).toBe("dibayar");
    expect(statusSlip({ dibayarPada: "2026-11-17T10:00:00.000Z" })).toBe(
      "dibayar",
    );
  });
});

describe("bacaStatusSlip", () => {
  it("hanya 'dibayar' yang dibaca dibayar, sisanya dibuat", () => {
    expect(bacaStatusSlip("dibayar")).toBe("dibayar");
    expect(bacaStatusSlip("dibuat")).toBe("dibuat");
    expect(bacaStatusSlip("aneh")).toBe("dibuat");
  });

  it("setiap status punya label", () => {
    for (const s of STATUS_SLIP) {
      expect(LABEL_STATUS_SLIP[s]).toBeTruthy();
    }
  });
});

describe("snapshotDariBaris", () => {
  it("menyalin semua komponen dan membekukan THP dari hitungPayroll", () => {
    const b = barisPayroll();
    const s = snapshotDariBaris(b, "2026-11", "admin-1");
    expect(s.userId).toBe("u-1");
    expect(s.nama).toBe("Budi");
    expect(s.periode).toBe("2026-11");
    expect(s.dibuatOleh).toBe("admin-1");
    expect(s.status).toBe("dibuat");
    expect(s.gajiPokok).toBe(2_000_000);
    expect(s.tunjanganMakan).toBe(400_000);
    expect(s.lembur).toBe(120_000);
    expect(s.insentif).toBe(300_000);
    expect(s.potonganTelat).toBe(15_000);
    expect(s.kasbon).toBe(100_000);
    expect(s.diterima).toBe(takeHomePay(b));
    expect(s.diterima).toBe(3_205_000);
  });

  it("komponen snapshot bisa dibaca kembali apa adanya", () => {
    const b = barisPayroll();
    const s = snapshotDariBaris(b, "2026-11", "admin-1");
    const k = komponenDariSnapshot({ ...slip(), ...s });
    expect(k.gajiPokok).toBe(b.gajiPokok);
    expect(k.tunjanganMakan).toBe(b.tunjanganMakan);
    expect(k.insentif).toBe(b.insentif);
  });

  it("snapshot membawa penyesuaian beserta keterangan", () => {
    const b = barisPayroll({
      penyesuaian: -50_000,
      keteranganPenyesuaian: "Potongan BPJS",
    });
    const s = snapshotDariBaris(b, "2026-11", "admin-1");
    expect(s.penyesuaian).toBe(-50_000);
    expect(s.keteranganPenyesuaian).toBe("Potongan BPJS");
    expect(s.diterima).toBe(takeHomePay(b));
    const gabung = gabungkanBarisSlip([b], new Map([[b.userId, { ...slip(), ...s }]]));
    expect(gabung[0].komponen.penyesuaian).toBe(-50_000);
    expect(gabung[0].keteranganPenyesuaian).toBe("Potongan BPJS");
  });
});

describe("terapkanTunjanganMakanDinamis", () => {
  it("centang dimatikan sesudah slip dibuat: tunjangan makan 0, THP turun selisihnya", () => {
    const s = slip({ tunjanganMakan: 400_000, diterima: 3_205_000 });
    const hasil = terapkanTunjanganMakanDinamis(s, 0);
    expect(hasil.tunjanganMakan).toBe(0);
    expect(hasil.diterima).toBe(2_805_000);
    // Komponen lain tidak berubah.
    expect(hasil.gajiPokok).toBe(2_000_000);
    expect(hasil.lembur).toBe(120_000);
    expect(hasil.status).toBe("dibuat");
  });

  it("centang dihidupkan sesudah slip dibuat: tunjangan makan muncul, THP naik", () => {
    const s = slip({ tunjanganMakan: 0, diterima: 2_805_000 });
    const hasil = terapkanTunjanganMakanDinamis(s, 400_000);
    expect(hasil.tunjanganMakan).toBe(400_000);
    expect(hasil.diterima).toBe(3_205_000);
  });
});

describe("gabungkanBarisSlip", () => {
  it("tanpa snapshot = Belum dibuat dengan THP hitungan saat ini", () => {
    const b = barisPayroll();
    const [r] = gabungkanBarisSlip([b], new Map());
    expect(r.status).toBe("belum");
    expect(r.dariSnapshot).toBe(false);
    expect(r.diterima).toBe(takeHomePay(b));
    expect(r.snapshot).toBeNull();
  });

  it("snapshot dibuat = Sudah dibuat dengan THP snapshot (bukan hitungan baru)", () => {
    const b = barisPayroll({ gajiPokok: 9_999_999 });
    const s = slip({ diterima: 3_205_000 });
    const [r] = gabungkanBarisSlip([b], new Map([["u-1", s]]));
    expect(r.status).toBe("dibuat");
    expect(r.dariSnapshot).toBe(true);
    expect(r.diterima).toBe(3_205_000);
    expect(r.komponen.gajiPokok).toBe(2_000_000);
  });

  it("snapshot dibayar = Sudah dibayar", () => {
    const b = barisPayroll();
    const s = slip({
      status: "dibayar",
      dibayarPada: new Date("2026-11-20T10:00:00.000Z"),
      dibayarOleh: "admin-1",
    });
    const [r] = gabungkanBarisSlip([b], new Map([["u-1", s]]));
    expect(r.status).toBe("dibayar");
    expect(r.snapshot?.dibayarPada).toEqual(
      new Date("2026-11-20T10:00:00.000Z"),
    );
  });

  it("tunjangan makan dinamis: snapshot lama mengikuti nilai live, komponen lain tetap beku", () => {
    const b = barisPayroll({ gajiPokok: 9_999_999, tunjanganMakan: 0 });
    const s = slip({ tunjanganMakan: 400_000, diterima: 3_205_000 });
    const [r] = gabungkanBarisSlip([b], new Map([["u-1", s]]));
    expect(r.status).toBe("dibuat");
    expect(r.dariSnapshot).toBe(true);
    expect(r.komponen.tunjanganMakan).toBe(0);
    expect(r.diterima).toBe(2_805_000);
    // Komponen lain tetap dari snapshot, bukan hitungan baru.
    expect(r.komponen.gajiPokok).toBe(2_000_000);
    expect(r.komponen.lembur).toBe(120_000);
  });
});

describe("infoSlipPdf", () => {
  it("tanpa snapshot: belum dibuat, semua tanggal null", () => {
    expect(infoSlipPdf(null, new Map())).toEqual({
      status: "belum",
      dibuatPada: null,
      dibayarPada: null,
      dibuatOleh: null,
      dibayarOleh: null,
    });
  });

  it("snapshot dibuat: tanggal diformat, nama pembuat dari peta", () => {
    const hasil = infoSlipPdf(
      slip(),
      new Map([["admin-1", "Admin Satu"]]),
    );
    expect(hasil).toEqual({
      status: "dibuat",
      dibuatPada: "17/11/2026",
      dibayarPada: null,
      dibuatOleh: "Admin Satu",
      dibayarOleh: null,
    });
  });

  it("snapshot dibayar: tanggal bayar terisi, nama tak dikenal kembali ke id", () => {
    const hasil = infoSlipPdf(
      slip({
        status: "dibayar",
        dibayarOleh: "admin-2",
        dibayarPada: new Date("2026-11-20T02:00:00.000Z"),
      }),
      new Map(),
    );
    expect(hasil.status).toBe("dibayar");
    expect(hasil.dibayarPada).toBe("20/11/2026");
    expect(hasil.dibayarOleh).toBe("admin-2");
  });
});

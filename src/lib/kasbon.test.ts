import { describe, expect, it } from "vitest";
import {
  ajukanKasbonSkema,
  bayarKasbonSkema,
  KASBON_MAKS,
  prosesKasbonSkema,
  sisaKasbon,
  statusSetelahBayar,
  totalKasbonUntukPayroll,
} from "./kasbon";

function formAjukan(ubah: Record<string, string> = {}) {
  return {
    jumlah: "1000000",
    periode: "2026-09",
    keterangan: "Keperluan mendesak",
    ...ubah,
  };
}

function galatAjukan(ubah: Record<string, string>) {
  const h = ajukanKasbonSkema.safeParse(formAjukan(ubah));
  return h.success ? null : h.error.issues[0].message;
}

describe("ajukanKasbonSkema", () => {
  it("menerima data valid", () => {
    const h = ajukanKasbonSkema.safeParse(formAjukan());
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data.jumlah).toBe(1_000_000);
      expect(h.data.keterangan).toBe("Keperluan mendesak");
    }
  });

  it("keterangan kosong menjadi null", () => {
    const h = ajukanKasbonSkema.safeParse(formAjukan({ keterangan: "" }));
    if (h.success) expect(h.data.keterangan).toBeNull();
  });

  it("menerima format titik ribuan", () => {
    const h = ajukanKasbonSkema.safeParse(formAjukan({ jumlah: "1.500.000" }));
    if (h.success) expect(h.data.jumlah).toBe(1_500_000);
  });

  it("menolak nol dan negatif", () => {
    expect(galatAjukan({ jumlah: "0" })).toMatch(/minimal/);
    expect(galatAjukan({ jumlah: "-1000" })).toBeTruthy();
  });

  it("menolak melebihi batas", () => {
    expect(galatAjukan({ jumlah: String(KASBON_MAKS + 1) })).toMatch(/batas/);
  });

  it("menolak periode tidak valid", () => {
    expect(galatAjukan({ periode: "2026-13" })).toBeTruthy();
    expect(galatAjukan({ periode: "Agustus" })).toBeTruthy();
  });
});

describe("prosesKasbonSkema", () => {
  it("menerima status valid", () => {
    expect(prosesKasbonSkema.safeParse({ id: "x", status: "disetujui" }).success).toBe(true);
    expect(prosesKasbonSkema.safeParse({ id: "x", status: "ditolak" }).success).toBe(true);
    expect(prosesKasbonSkema.safeParse({ id: "x", status: "lunas" }).success).toBe(true);
  });

  it("menolak status tidak dikenal", () => {
    expect(prosesKasbonSkema.safeParse({ id: "x", status: "pending" }).success).toBe(false);
  });
});

describe("sisa dan payroll kasbon", () => {
  it("sisa tidak pernah negatif", () => {
    expect(sisaKasbon({ jumlah: 100000, jumlahTerbayar: 40000 })).toBe(60000);
    expect(sisaKasbon({ jumlah: 100000, jumlahTerbayar: 150000 })).toBe(0);
    expect(sisaKasbon({ jumlah: 100000 })).toBe(100000);
  });
  it("payroll hanya menarik sisa kasbon disetujui", () => {
    expect(
      totalKasbonUntukPayroll([
        { status: "disetujui", jumlah: 100000, jumlahTerbayar: 40000 },
        { status: "disetujui", jumlah: 50000, jumlahTerbayar: 0 },
        { status: "pending", jumlah: 999999, jumlahTerbayar: 0 },
        { status: "ditolak", jumlah: 999999, jumlahTerbayar: 0 },
        { status: "lunas", jumlah: 999999, jumlahTerbayar: 999999 },
        { status: "dibatalkan", jumlah: 999999, jumlahTerbayar: 0 },
      ]),
    ).toBe(110000);
  });
  it("lunas hanya bila terbayar mencapai jumlah penuh", () => {
    expect(statusSetelahBayar(100000, 99999)).toBe("disetujui");
    expect(statusSetelahBayar(100000, 100000)).toBe("lunas");
  });
  it("skema bayar menolak nol dan melebihi batas kasbon", () => {
    expect(
      bayarKasbonSkema.safeParse({ id: "x", jumlahBayar: "0" }).success,
    ).toBe(false);
    expect(
      bayarKasbonSkema.safeParse({ id: "x", jumlahBayar: "50000" }).success,
    ).toBe(true);
  });
});

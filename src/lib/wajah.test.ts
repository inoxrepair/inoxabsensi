import { describe, expect, it } from "vitest";
import { bacaStatusWajah, LABEL_STATUS_WAJAH, WARNA_STATUS_WAJAH } from "./wajah";

describe("bacaStatusWajah", () => {
  it("menerima status histori yang dikenal", () => {
    expect(bacaStatusWajah("cocok")).toBe("cocok");
    expect(bacaStatusWajah("tidak_cocok")).toBe("tidak_cocok");
    expect(bacaStatusWajah("belum_daftar")).toBe("belum_daftar");
  });

  it("mengembalikan null untuk nilai lain", () => {
    expect(bacaStatusWajah("ngawur")).toBeNull();
    expect(bacaStatusWajah(null)).toBeNull();
  });

  it("setiap status punya label dan warna", () => {
    for (const s of ["cocok", "tidak_cocok", "belum_daftar"] as const) {
      expect(LABEL_STATUS_WAJAH[s]).toBeTruthy();
      expect(WARNA_STATUS_WAJAH[s]).toBeTruthy();
    }
  });
});

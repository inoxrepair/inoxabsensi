import { describe, expect, it } from "vitest";
import { batasiMenuGajiAdminCabang, bolehUbahHakAkses } from "@/lib/hak-akses";

describe("bolehUbahHakAkses", () => {
  it("menolak super admin mencabut aksesnya sendiri ke Pengaturan", () => {
    expect(bolehUbahHakAkses("super_admin", "pengaturan", false)).toBe(false);
  });

  it("mengizinkan super admin memberi akses Pengaturan", () => {
    expect(bolehUbahHakAkses("super_admin", "pengaturan", true)).toBe(true);
  });

  it("mengizinkan super admin mengubah menu lain", () => {
    expect(bolehUbahHakAkses("super_admin", "karyawan", false)).toBe(true);
    expect(bolehUbahHakAkses("super_admin", "payroll", true)).toBe(true);
  });

  it("mengizinkan role lain mengubah Pengaturan", () => {
    expect(bolehUbahHakAkses("admin_cabang", "pengaturan", false)).toBe(true);
    expect(bolehUbahHakAkses("headstore", "pengaturan", true)).toBe(true);
    expect(bolehUbahHakAkses("karyawan", "pengaturan", false)).toBe(true);
  });
});

describe("batasiMenuGajiAdminCabang", () => {
  const semua = new Set([
    "dashboard",
    "karyawan",
    "payroll",
    "slip-gaji",
    "chat",
  ]);

  it("toggle mati: admin_cabang kehilangan payroll + slip-gaji, menu lain tetap", () => {
    const hasil = batasiMenuGajiAdminCabang(semua, "admin_cabang", false);
    expect(hasil.has("payroll")).toBe(false);
    expect(hasil.has("slip-gaji")).toBe(false);
    expect(hasil.has("dashboard")).toBe(true);
    expect(hasil.has("karyawan")).toBe(true);
    expect(hasil.has("chat")).toBe(true);
    // Set asal tidak diubah.
    expect(semua.has("payroll")).toBe(true);
  });

  it("toggle aktif: admin_cabang tetap memegang payroll + slip-gaji", () => {
    const hasil = batasiMenuGajiAdminCabang(semua, "admin_cabang", true);
    expect(hasil.has("payroll")).toBe(true);
    expect(hasil.has("slip-gaji")).toBe(true);
  });

  it("role lain tidak terpengaruh toggle", () => {
    expect(
      batasiMenuGajiAdminCabang(semua, "super_admin", false).has("payroll"),
    ).toBe(true);
    expect(
      batasiMenuGajiAdminCabang(semua, "headstore", false).has("slip-gaji"),
    ).toBe(true);
  });
});

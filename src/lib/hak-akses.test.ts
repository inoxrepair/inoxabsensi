import { describe, expect, it } from "vitest";
import { bolehUbahHakAkses } from "@/lib/hak-akses";

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

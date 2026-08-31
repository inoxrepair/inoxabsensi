import { describe, expect, it } from "vitest";
import { validasiKaryawan } from "./karyawan";

function form(ubah: Record<string, string | undefined> = {}) {
  return {
    name: "Rizky Pratama",
    email: "RIZKY@INOX.CO.ID ",
    jabatan: "Teknisi",
    tanggalMasuk: "2026-08-31",
    role: "karyawan",
    cabangId: "c1",
    aktif: "on",
    password: "inox12345",
    ...ubah,
  };
}

function pesan(ubah: Record<string, string | undefined>, membuat = true) {
  const h = validasiKaryawan(form(ubah), membuat);
  return h.success ? null : h.error.issues[0].message;
}

describe("validasiKaryawan", () => {
  it("menormalkan email dan checkbox", () => {
    const h = validasiKaryawan(form(), true);
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data.email).toBe("rizky@inox.co.id");
      expect(h.data.aktif).toBe(true);
    }
  });

  it("checkbox kosong berarti nonaktif", () => {
    const h = validasiKaryawan(form({ aktif: undefined }), true);
    if (h.success) expect(h.data.aktif).toBe(false);
  });

  it("password wajib saat membuat akun", () => {
    expect(pesan({ password: "" }, true)).toMatch(/Password wajib/);
  });

  it("password boleh kosong saat edit", () => {
    expect(validasiKaryawan(form({ password: "" }), false).success).toBe(true);
  });

  it("password baru minimal 8 karakter", () => {
    expect(pesan({ password: "pendek" }, false)).toMatch(/minimal 8/);
  });

  it("menolak email tidak valid", () => {
    expect(pesan({ email: "bukan-email" })).toMatch(/email tidak valid/i);
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(pesan({ tanggalMasuk: "2026-02-31" })).toMatch(/Tanggal masuk/);
  });

  it("cabang wajib untuk karyawan", () => {
    expect(pesan({ cabangId: "" })).toMatch(/Cabang wajib/);
  });

  it("super admin boleh tanpa cabang", () => {
    const h = validasiKaryawan(
      form({ role: "super_admin", cabangId: "" }),
      true,
    );
    expect(h.success).toBe(true);
    if (h.success) expect(h.data.cabangId).toBeNull();
  });

  it("headstore diterima dan wajib memiliki cabang", () => {
    expect(validasiKaryawan(form({ role: "headstore" }), true).success).toBe(
      true,
    );
    expect(pesan({ role: "headstore", cabangId: "" })).toMatch(/Cabang wajib/);
  });

  it("menolak role di luar daftar", () => {
    expect(pesan({ role: "owner" })).toBeTruthy();
  });

  it("memangkas nama dan jabatan", () => {
    const h = validasiKaryawan(
      form({ name: "  Siti Nurhaliza  ", jabatan: "  Kasir  " }),
      true,
    );
    if (h.success) {
      expect(h.data.name).toBe("Siti Nurhaliza");
      expect(h.data.jabatan).toBe("Kasir");
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  forbidden: vi.fn(() => {
    throw new Error("FORBIDDEN");
  }),
  redirect: vi.fn((tujuan: string) => {
    throw new Error(`REDIRECT:${tujuan}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUnique },
  },
}));
vi.mock("next/navigation", () => ({
  forbidden: mocks.forbidden,
  redirect: mocks.redirect,
}));

import { wajibLogin } from "./session";

const userAktif = {
  id: "user-1",
  name: "Pengguna",
  email: "user@inox.co.id",
  role: "karyawan",
  cabangId: null,
  jabatan: "Teknisi",
  aktif: true,
};

describe("wajibLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: userAktif.id, email: userAktif.email },
    });
  });

  it.each(["admin_cabang", "headstore"])(
    "menolak role %s yang tidak memiliki cabang",
    async (role) => {
      mocks.findUnique.mockResolvedValue({ ...userAktif, role });

      await expect(wajibLogin()).rejects.toThrow("FORBIDDEN");
      expect(mocks.forbidden).toHaveBeenCalledOnce();
    },
  );

  it("mengizinkan super admin tanpa cabang", async () => {
    mocks.findUnique.mockResolvedValue({ ...userAktif, role: "super_admin" });

    await expect(wajibLogin()).resolves.toMatchObject({
      id: userAktif.id,
      role: "super_admin",
      cabangId: null,
    });
    expect(mocks.forbidden).not.toHaveBeenCalled();
  });
});

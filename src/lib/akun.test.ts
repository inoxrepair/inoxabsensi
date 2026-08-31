import { describe, expect, it } from "vitest";
import { gantiPasswordSkema, loginSkema } from "./akun";

describe("loginSkema", () => {
  it("menerima username", () => {
    expect(loginSkema.safeParse({ identifier: "rizky", password: "rahasia" }).success).toBe(true);
  });

  it("menerima email", () => {
    expect(loginSkema.safeParse({ identifier: "rizky@inox.co.id", password: "rahasia" }).success).toBe(true);
  });

  it("menolak identifier kosong", () => {
    expect(loginSkema.safeParse({ identifier: "", password: "x" }).success).toBe(false);
  });
});

describe("gantiPasswordSkema", () => {
  it("menerima password baru yang valid", () => {
    expect(gantiPasswordSkema.safeParse({ passwordLama: "lama1234", passwordBaru: "baru12345", konfirmasi: "baru12345" }).success).toBe(true);
  });

  it("menolak konfirmasi berbeda", () => {
    expect(gantiPasswordSkema.safeParse({ passwordLama: "lama1234", passwordBaru: "baru12345", konfirmasi: "beda12345" }).success).toBe(false);
  });

  it("menolak password baru sama dengan lama", () => {
    expect(gantiPasswordSkema.safeParse({ passwordLama: "sama12345", passwordBaru: "sama12345", konfirmasi: "sama12345" }).success).toBe(false);
  });
});

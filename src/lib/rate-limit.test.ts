import { describe, expect, it } from "vitest";
import {
  batasLoginTercapai,
  BATAS_GAGAL_LOGIN,
  catatGagalLogin,
  JENDELA_GAGAL_LOGIN_MS,
  resetGagalLogin,
} from "./rate-limit";

describe("rate limit login", () => {
  it("di bawah batas belum dibatasi, pada batas dibatasi", () => {
    const store = new Map<string, number[]>();
    const now = 1_000_000;
    for (let i = 0; i < BATAS_GAGAL_LOGIN - 1; i++) {
      catatGagalLogin("Budi", "1.2.3.4", now + i, store);
    }
    expect(batasLoginTercapai("budi", "1.2.3.4", now + 100, store)).toBe(false);
    catatGagalLogin("budi", "1.2.3.4", now + 100, store);
    expect(batasLoginTercapai("budi", "1.2.3.4", now + 101, store)).toBe(true);
  });
  it("identifier dan IP berbeda tidak saling mengunci", () => {
    const store = new Map<string, number[]>();
    for (let i = 0; i < BATAS_GAGAL_LOGIN; i++) {
      catatGagalLogin("budi", "1.2.3.4", 1000 + i, store);
    }
    expect(batasLoginTercapai("ani", "1.2.3.4", 2000, store)).toBe(false);
    expect(batasLoginTercapai("budi", "5.6.7.8", 2000, store)).toBe(false);
  });
  it("percobaan lama di luar jendela tidak dihitung", () => {
    const store = new Map<string, number[]>();
    for (let i = 0; i < BATAS_GAGAL_LOGIN; i++) {
      catatGagalLogin("budi", "1.2.3.4", 1000, store);
    }
    expect(
      batasLoginTercapai("budi", "1.2.3.4", 1000 + JENDELA_GAGAL_LOGIN_MS + 1, store),
    ).toBe(false);
  });
  it("reset menghapus hitungan", () => {
    const store = new Map<string, number[]>();
    for (let i = 0; i < BATAS_GAGAL_LOGIN; i++) {
      catatGagalLogin("budi", "1.2.3.4", 1000 + i, store);
    }
    resetGagalLogin("budi", "1.2.3.4", store);
    expect(batasLoginTercapai("budi", "1.2.3.4", 2000, store)).toBe(false);
  });
});

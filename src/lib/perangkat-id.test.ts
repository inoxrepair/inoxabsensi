import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  apakahIdPerangkatValid,
  bacaIdPerangkat,
  bacaIdPerangkatDariCookie,
  buatIdPerangkat,
  KUNCI_ID_PERANGKAT,
  NAMA_COOKIE_PERANGKAT,
} from "./perangkat-id";

describe("buatIdPerangkat", () => {
  it("10 karakter heksadesimal huruf besar", () => {
    expect(buatIdPerangkat()).toMatch(/^[0-9A-F]{10}$/);
  });

  it("dua panggilan menghasilkan ID berbeda", () => {
    expect(buatIdPerangkat()).not.toBe(buatIdPerangkat());
  });
});

describe("apakahIdPerangkatValid", () => {
  it("menerima bentuk yang dibuat buatIdPerangkat", () => {
    expect(apakahIdPerangkatValid("A3F9C21E87")).toBe(true);
  });

  it("menolak huruf kecil, panjang salah, dan karakter lain", () => {
    expect(apakahIdPerangkatValid("a3f9c21e87")).toBe(false);
    expect(apakahIdPerangkatValid("A3F9C21E8")).toBe(false);
    expect(apakahIdPerangkatValid("A3F9C21E871")).toBe(false);
    expect(apakahIdPerangkatValid("A3F9C21E8!")).toBe(false);
    expect(apakahIdPerangkatValid("")).toBe(false);
  });
});

describe("bacaIdPerangkatDariCookie", () => {
  it("mengambil ID di antara cookie lain", () => {
    expect(
      bacaIdPerangkatDariCookie(
        `foo=bar; ${NAMA_COOKIE_PERANGKAT}=A3F9C21E87; lain=x`,
      ),
    ).toBe("A3F9C21E87");
  });

  it("null bila tidak ada atau tidak valid", () => {
    expect(bacaIdPerangkatDariCookie("foo=bar")).toBe(null);
    expect(bacaIdPerangkatDariCookie("")).toBe(null);
    expect(
      bacaIdPerangkatDariCookie(`${NAMA_COOKIE_PERANGKAT}=bukan-id`),
    ).toBe(null);
  });
});

describe("bacaIdPerangkat (tanpa browser)", () => {
  it("di server (tidak ada window) mengembalikan null", () => {
    expect(typeof window).toBe("undefined");
    expect(bacaIdPerangkat()).toBe(null);
  });
});

describe("bacaIdPerangkat (browser)", () => {
  const simpan = new Map<string, string>();
  const penyimpanan = {
    getItem: (kunci: string) => simpan.get(kunci) ?? null,
    setItem: (kunci: string, nilai: string) => {
      simpan.set(kunci, nilai);
    },
    removeItem: (kunci: string) => {
      simpan.delete(kunci);
    },
  };

  beforeEach(() => {
    simpan.clear();
    (globalThis as Record<string, unknown>).window = {
      localStorage: penyimpanan,
    };
    (globalThis as Record<string, unknown>).document = { cookie: "" };
    (globalThis as Record<string, unknown>).location = {
      protocol: "https:",
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).location;
  });

  it("panggilan pertama membuat ID dan menyimpannya di localStorage + cookie", () => {
    const id = bacaIdPerangkat();
    expect(id).toMatch(/^[0-9A-F]{10}$/);
    expect(simpan.get(KUNCI_ID_PERANGKAT)).toBe(id);
    expect(
      (globalThis as { document: { cookie: string } }).document.cookie,
    ).toContain(`${NAMA_COOKIE_PERANGKAT}=${id}`);
  });

  it("panggilan kedua memakai ID yang sama", () => {
    const pertama = bacaIdPerangkat();
    expect(bacaIdPerangkat()).toBe(pertama);
  });

  it("localStorage kosong tapi cookie ada -> ID dipulihkan ke localStorage", () => {
    const pertama = bacaIdPerangkat();
    simpan.delete(KUNCI_ID_PERANGKAT);
    expect(bacaIdPerangkat()).toBe(pertama);
    expect(simpan.get(KUNCI_ID_PERANGKAT)).toBe(pertama);
  });
});

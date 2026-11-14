import { describe, expect, it } from "vitest";
import {
  bacaJenisLogLogin,
  perangkatDariAgen,
  tandaiMencurigakan,
  type BarisLogLogin,
} from "./log-login";

const AGEN_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const AGEN_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
const AGEN_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function baris(
  sebagian: Partial<BarisLogLogin> & { id: string },
): BarisLogLogin {
  return {
    userId: "u1",
    cabangId: "c1",
    nama: "Andi",
    cabang: "KWSN",
    jenis: "masuk",
    ip: "103.1.2.3",
    agen: AGEN_ANDROID,
    dibuatPada: new Date("2026-11-14T00:30:00.000Z"),
    ...sebagian,
  };
}

describe("perangkatDariAgen", () => {
  it("Android Chrome dengan model", () => {
    expect(perangkatDariAgen(AGEN_ANDROID)).toBe(
      "Chrome · Android (SM-A546E)",
    );
  });

  it("iPhone Safari", () => {
    expect(perangkatDariAgen(AGEN_IPHONE)).toBe("Safari · iPhone");
  });

  it("Windows Chrome", () => {
    expect(perangkatDariAgen(AGEN_WINDOWS)).toBe("Chrome · Windows");
  });

  it("kosong -> Tidak diketahui", () => {
    expect(perangkatDariAgen("")).toBe("Tidak diketahui");
    expect(perangkatDariAgen("  ")).toBe("Tidak diketahui");
  });
});

describe("bacaJenisLogLogin", () => {
  it("keluar tetap keluar, selain itu masuk", () => {
    expect(bacaJenisLogLogin("keluar")).toBe("keluar");
    expect(bacaJenisLogLogin("masuk")).toBe("masuk");
    expect(bacaJenisLogLogin("aneh")).toBe("masuk");
  });
});

describe("tandaiMencurigakan", () => {
  it("satu perangkat dipakai 2 akun dalam 10 menit -> keduanya ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a", userId: "u1" }),
      baris({
        id: "b",
        userId: "u2",
        nama: "Budi",
        dibuatPada: new Date("2026-11-14T00:40:00.000Z"),
      }),
    ]);
    expect(hasil.get("a")).toBe("Satu perangkat dipakai 2 akun");
    expect(hasil.get("b")).toBe("Satu perangkat dipakai 2 akun");
  });

  it("satu perangkat dipakai 2 akun 40 menit berselang -> tidak ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a", userId: "u1" }),
      baris({
        id: "b",
        userId: "u2",
        nama: "Budi",
        dibuatPada: new Date("2026-11-14T01:10:00.000Z"),
      }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("akun yang sama di perangkat yang sama -> tidak ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a", jenis: "masuk" }),
      baris({
        id: "b",
        jenis: "keluar",
        dibuatPada: new Date("2026-11-14T08:30:00.000Z"),
      }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("IP sama tapi perangkat berbeda -> tidak ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a", userId: "u1" }),
      baris({ id: "b", userId: "u2", nama: "Budi", agen: AGEN_IPHONE }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("akun login dari perangkat berbeda dari biasanya -> ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a", dibuatPada: new Date("2026-11-12T00:30:00.000Z") }),
      baris({ id: "b", dibuatPada: new Date("2026-11-13T00:30:00.000Z") }),
      baris({ id: "c", dibuatPada: new Date("2026-11-14T00:30:00.000Z") }),
      baris({
        id: "d",
        agen: AGEN_IPHONE,
        dibuatPada: new Date("2026-11-14T00:35:00.000Z"),
      }),
    ]);
    expect(hasil.get("d")).toBe("Perangkat berbeda dari biasanya");
    expect(hasil.has("a")).toBe(false);
    expect(hasil.has("b")).toBe(false);
    expect(hasil.has("c")).toBe(false);
  });

  it("akun baru (kurang dari 3 baris) tidak ditandai aturan 2", () => {
    const hasil = tandaiMencurigakan([
      baris({ id: "a" }),
      baris({ id: "b", agen: AGEN_IPHONE }),
    ]);
    expect(hasil.size).toBe(0);
  });
});

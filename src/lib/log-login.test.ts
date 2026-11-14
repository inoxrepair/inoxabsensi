import { describe, expect, it } from "vitest";
import {
  bacaJenisLogLogin,
  perangkatDariAgen,
  sidikPerangkat,
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
    perangkatId: null,
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

describe("sidikPerangkat", () => {
  it("ID perangkat menang atas IP + User-Agent", () => {
    expect(sidikPerangkat("103.1.2.3", AGEN_IPHONE, "A3F9C21E87")).toBe(
      "id:A3F9C21E87",
    );
    expect(sidikPerangkat("103.9.9.9", AGEN_ANDROID, "A3F9C21E87")).toBe(
      "id:A3F9C21E87",
    );
  });

  it("tanpa ID jatuh kembali ke IP + User-Agent", () => {
    expect(sidikPerangkat("103.1.2.3", AGEN_IPHONE, null)).toBe(
      `103.1.2.3|${AGEN_IPHONE}`,
    );
    expect(sidikPerangkat("103.1.2.3", AGEN_IPHONE)).toBe(
      `103.1.2.3|${AGEN_IPHONE}`,
    );
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

  it("dua iPhone (UA sama) dengan ID perangkat sama dipakai 2 akun -> keduanya ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        userId: "u1",
        agen: AGEN_IPHONE,
        perangkatId: "A3F9C21E87",
      }),
      baris({
        id: "b",
        userId: "u2",
        nama: "Budi",
        agen: AGEN_IPHONE,
        perangkatId: "A3F9C21E87",
        dibuatPada: new Date("2026-11-14T00:40:00.000Z"),
      }),
    ]);
    expect(hasil.get("a")).toBe("Satu perangkat dipakai 2 akun");
    expect(hasil.get("b")).toBe("Satu perangkat dipakai 2 akun");
  });

  it("dua iPhone (UA sama) dengan ID perangkat berbeda -> tidak ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        userId: "u1",
        agen: AGEN_IPHONE,
        perangkatId: "A3F9C21E87",
      }),
      baris({
        id: "b",
        userId: "u2",
        nama: "Budi",
        agen: AGEN_IPHONE,
        perangkatId: "B71D04F3C2",
        dibuatPada: new Date("2026-11-14T00:40:00.000Z"),
      }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("baris ber-ID dan baris tanpa ID tidak digabung walau IP + UA sama", () => {
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        userId: "u1",
        agen: AGEN_IPHONE,
        perangkatId: "A3F9C21E87",
      }),
      baris({
        id: "b",
        userId: "u2",
        nama: "Budi",
        agen: AGEN_IPHONE,
        perangkatId: null,
        dibuatPada: new Date("2026-11-14T00:40:00.000Z"),
      }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("aturan 2 memakai ID perangkat: akun biasa di ID A, sekali di ID B -> ditandai", () => {
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        perangkatId: "A3F9C21E87",
        dibuatPada: new Date("2026-11-12T00:30:00.000Z"),
      }),
      baris({
        id: "b",
        perangkatId: "A3F9C21E87",
        dibuatPada: new Date("2026-11-13T00:30:00.000Z"),
      }),
      baris({
        id: "c",
        perangkatId: "A3F9C21E87",
        dibuatPada: new Date("2026-11-14T00:30:00.000Z"),
      }),
      baris({
        id: "d",
        perangkatId: "B71D04F3C2",
        dibuatPada: new Date("2026-11-14T00:35:00.000Z"),
      }),
    ]);
    expect(hasil.get("d")).toBe("Perangkat berbeda dari biasanya");
    expect(hasil.has("a")).toBe(false);
    expect(hasil.has("b")).toBe(false);
    expect(hasil.has("c")).toBe(false);
  });

  it("masa peralihan: 2 baris lama tanpa ID + 1 baris ber-ID di HP yang sama -> tidak ditandai", () => {
    // Kasus Ucok 2026-11-15: baris ber-ID pertama langsung ditandai
    // "Perangkat berbeda dari biasanya" padahal HP-nya sama — sidik
    // lama (IP+UA) dan sidik baru (ID) dibaca sebagai dua perangkat.
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        agen: AGEN_IPHONE,
        perangkatId: null,
        dibuatPada: new Date("2026-11-14T16:30:00.000Z"),
      }),
      baris({
        id: "b",
        jenis: "keluar",
        agen: AGEN_IPHONE,
        perangkatId: null,
        dibuatPada: new Date("2026-11-14T17:00:00.000Z"),
      }),
      baris({
        id: "c",
        agen: AGEN_IPHONE,
        perangkatId: "77D00B4003",
        dibuatPada: new Date("2026-11-14T17:05:00.000Z"),
      }),
    ]);
    expect(hasil.size).toBe(0);
  });

  it("ambigu: satu kunci IP+UA memetakan ke 2 ID di akun itu -> baris lama tetap fallback", () => {
    // Dua HP di akun yang sama (IP + UA sama): baris lama tidak
    // ditebak pemiliknya, jadi baris ber-ID tetap ditandai terhadap
    // baseline fallback.
    const hasil = tandaiMencurigakan([
      baris({
        id: "a",
        agen: AGEN_IPHONE,
        perangkatId: null,
        dibuatPada: new Date("2026-11-12T00:30:00.000Z"),
      }),
      baris({
        id: "b",
        agen: AGEN_IPHONE,
        perangkatId: null,
        dibuatPada: new Date("2026-11-13T00:30:00.000Z"),
      }),
      baris({
        id: "c",
        agen: AGEN_IPHONE,
        perangkatId: "A3F9C21E87",
        dibuatPada: new Date("2026-11-14T00:30:00.000Z"),
      }),
      baris({
        id: "d",
        agen: AGEN_IPHONE,
        perangkatId: "B71D04F3C2",
        dibuatPada: new Date("2026-11-14T00:35:00.000Z"),
      }),
    ]);
    expect(hasil.get("c")).toBe("Perangkat berbeda dari biasanya");
    expect(hasil.get("d")).toBe("Perangkat berbeda dari biasanya");
    expect(hasil.has("a")).toBe(false);
    expect(hasil.has("b")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  bacaCookieDariHeaders,
  cocokkanUser,
  gabungkanCookie,
  normalisasiNama,
  pecahSetCookie,
  ubahTanggalKeIso,
} from "./insentif";

const USERS = [
  { id: "u1", name: "Fajri Mokodompit" },
  { id: "u2", name: "Ano" },
  { id: "u3", name: "Doni Djuuna" },
  { id: "u4", name: "nizam" },
];

describe("normalisasiNama", () => {
  it("membuang spasi dan mengubah ke huruf kecil", () => {
    expect(normalisasiNama("Fajri Mokodompit")).toBe("fajrimokodompit");
    expect(normalisasiNama("  FajriMokodompit ")).toBe("fajrimokodompit");
  });

  it("membuang simbol dan tanda baca", () => {
    expect(normalisasiNama("Fajri-Mokodompit.")).toBe("fajrimokodompit");
  });
});

describe("cocokkanUser", () => {
  it("cocok walau nama iNOX tanpa spasi", () => {
    expect(cocokkanUser("FajriMokodompit", USERS)).toBe("u1");
    expect(cocokkanUser("DoniDjuuna", USERS)).toBe("u3");
  });

  it("cocok walau beda huruf besar-kecil", () => {
    expect(cocokkanUser("fajri mokodompit", USERS)).toBe("u1");
    expect(cocokkanUser("NIZAM", USERS)).toBe("u4");
    expect(cocokkanUser("ANO", USERS)).toBe("u2");
  });

  it("tidak cocok bila hanya sebagian nama (tanpa contains)", () => {
    // "Fajri" saja bukan karyawan yang sama; harus masuk daftar
    // tidakDicocokkan untuk ditinjau manual, bukan ditebak.
    expect(cocokkanUser("Fajri", USERS)).toBeNull();
    expect(cocokkanUser("Doni", USERS)).toBeNull();
  });

  it("tidak salah cocok nama pendek ke nama lain", () => {
    // "Ano" tidak boleh cocok ke "Fajri Mokodompit" atau siapa pun.
    expect(cocokkanUser("Ano", USERS)).toBe("u2");
    expect(cocokkanUser("Zano", USERS)).toBeNull();
  });

  it("nama kosong tidak cocok", () => {
    expect(cocokkanUser("", USERS)).toBeNull();
    expect(cocokkanUser("   ", USERS)).toBeNull();
  });

  it("pemetaan manual menang atas pencocokan nama", () => {
    // "FajriMokodompit" persis cocok ke u1 lewat nama, tapi pemetaan
    // untuk kunci itu harus menang — admin sudah memastikan orangnya.
    expect(
      cocokkanUser("FajriMokodompit", USERS, [
        { namaKunci: "fajrimokodompit", userId: "u2" },
      ]),
    ).toBe("u2");
  });

  it("pemetaan cocok walau nama tidak cocok ke siapa pun", () => {
    const pemetaan = [
      { namaKunci: "fajri", userId: "u2" },
      { namaKunci: "doni", userId: "u3" },
    ];
    expect(cocokkanUser("Fajri", USERS, pemetaan)).toBe("u2");
    expect(cocokkanUser("Doni", USERS, pemetaan)).toBe("u3");
  });

  it("pemetaan dicocokkan setelah normalisasi nama", () => {
    const pemetaan = [{ namaKunci: "fajri", userId: "u2" }];
    expect(cocokkanUser("FAJRI", USERS, pemetaan)).toBe("u2");
    expect(cocokkanUser("Fajri ", USERS, pemetaan)).toBe("u2");
  });

  it("tanpa pemetaan, nama yang tidak cocok tetap null", () => {
    expect(cocokkanUser("Fajri", USERS, [])).toBeNull();
    expect(cocokkanUser("Fajri", USERS)).toBeNull();
  });
});

describe("ubahTanggalKeIso", () => {
  it("mengubah dd-mm-yyyy menjadi yyyy-mm-dd", () => {
    expect(ubahTanggalKeIso("05-11-2026")).toBe("2026-11-05");
    expect(ubahTanggalKeIso("31-01-2026")).toBe("2026-01-31");
  });

  it("mengembalikan string kosong bila tidak cocok pola", () => {
    expect(ubahTanggalKeIso("2026-11-05")).toBe("");
    expect(ubahTanggalKeIso("5-11-2026")).toBe("");
    expect(ubahTanggalKeIso("")).toBe("");
  });
});

describe("pecahSetCookie dan gabungkanCookie", () => {
  it("tidak memotong cookie pada koma di dalam Expires", () => {
    const header =
      "session=abc123; Path=/; HttpOnly, XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/";
    const pecah = pecahSetCookie(header);
    expect(pecah).toHaveLength(2);
    expect(pecah[0]).toContain("session=abc123");
    expect(pecah[1]).toContain("XSRF-TOKEN=xyz");
    expect(gabungkanCookie(pecah)).toBe("session=abc123; XSRF-TOKEN=xyz");
  });

  it("header kosong menghasilkan string kosong", () => {
    expect(pecahSetCookie("")).toEqual([]);
    expect(gabungkanCookie([])).toBe("");
  });
});

describe("bacaCookieDariHeaders", () => {
  it("memakai getSetCookie bila tersedia", () => {
    const headers = new Headers();
    const palsu = headers as unknown as {
      getSetCookie: () => string[];
    };
    palsu.getSetCookie = () => [
      "session=abc; Path=/; HttpOnly",
      "XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/",
    ];
    expect(bacaCookieDariHeaders(headers)).toBe("session=abc; XSRF-TOKEN=xyz");
  });

  it("fallback ke header set-cookie gabungan bila getSetCookie tidak ada", () => {
    // Objek header tiruan tanpa getSetCookie (mis. implementasi fetch lama):
    // get("set-cookie") mengembalikan satu string gabungan.
    const tiruan = {
      get: (nama: string) =>
        nama === "set-cookie"
          ? "session=abc123; Path=/; HttpOnly, XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/"
          : null,
    } as unknown as Headers;
    expect(bacaCookieDariHeaders(tiruan)).toBe("session=abc123; XSRF-TOKEN=xyz");
  });
});

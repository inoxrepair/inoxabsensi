import { describe, expect, it } from "vitest";
import { periodeTop10 } from "./top5-data";

/**
 * Semua instans ditulis UTC; WITA = UTC+8.
 * 28/11/2026 adalah hari pertama periode "2026-12" (28/11–27/12).
 */
describe("periodeTop10", () => {
  it("hari pertama periode baru sebelum 22.00 WITA masih periode lama", () => {
    // 08:23 WITA 28/11 — kasus yang dilaporkan Ucok.
    expect(periodeTop10(new Date("2026-11-28T00:23:00.000Z"))).toBe(
      "2026-11",
    );
    // 21:59 WITA 28/11 — semenit sebelum ganti.
    expect(periodeTop10(new Date("2026-11-28T13:59:00.000Z"))).toBe(
      "2026-11",
    );
  });

  it("tepat 22.00 WITA hari pertama pindah ke periode baru", () => {
    expect(periodeTop10(new Date("2026-11-28T14:00:00.000Z"))).toBe(
      "2026-12",
    );
    // 23:00 WITA hari yang sama tetap periode baru.
    expect(periodeTop10(new Date("2026-11-28T15:00:00.000Z"))).toBe(
      "2026-12",
    );
  });

  it("hari kedua periode dan seterusnya sudah periode baru", () => {
    expect(periodeTop10(new Date("2026-11-29T00:00:00.000Z"))).toBe(
      "2026-12",
    );
    expect(periodeTop10(new Date("2026-12-15T00:00:00.000Z"))).toBe(
      "2026-12",
    );
  });

  it("hari terakhir periode lama tetap periode lama", () => {
    // 18:00 WITA 27/11 — hari terakhir periode 2026-11.
    expect(periodeTop10(new Date("2026-11-27T10:00:00.000Z"))).toBe(
      "2026-11",
    );
    // Tengah periode.
    expect(periodeTop10(new Date("2026-11-15T00:00:00.000Z"))).toBe(
      "2026-11",
    );
  });

  it("melewati pergantian tahun", () => {
    // 21:00 WITA 28/12 — hari pertama periode 2027-01, sebelum 22.00.
    expect(periodeTop10(new Date("2026-12-28T13:00:00.000Z"))).toBe(
      "2026-12",
    );
    // 22:00 WITA 28/12 — pindah ke 2027-01.
    expect(periodeTop10(new Date("2026-12-28T14:00:00.000Z"))).toBe(
      "2027-01",
    );
    // 08:00 WITA 01/01 — bukan hari pertama, tetap 2027-01.
    expect(periodeTop10(new Date("2027-01-01T00:00:00.000Z"))).toBe(
      "2027-01",
    );
  });
});

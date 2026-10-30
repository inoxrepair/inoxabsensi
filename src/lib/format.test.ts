import { describe, expect, it } from "vitest";
import { formatTanggal, formatTanggalPanjang, parseTanggalIso } from "./format";

describe("formatTanggal", () => {
  it("memformat dd/mm/yyyy dengan nol di depan", () => {
    expect(formatTanggal("2026-10-29")).toBe("29/10/2026");
    expect(formatTanggal("2026-02-01")).toBe("01/02/2026");
    expect(formatTanggal("2026-2-3")).toBe("03/02/2026");
  });
  it("format panjang sama dengan format pendek (dd/mm/yyyy)", () => {
    expect(formatTanggalPanjang("2026-10-29")).toBe("29/10/2026");
  });
  it("fallback aman untuk tanggal tidak valid", () => {
    expect(formatTanggal("2026-02-31")).toBe("2026-02-31");
    expect(formatTanggal("2026-13-01")).toBe("2026-13-01");
    expect(formatTanggal("29/10/2026")).toBe("29/10/2026");
    expect(formatTanggal("bukan-tanggal")).toBe("bukan-tanggal");
    expect(formatTanggal("")).toBe("");
  });
  it("parseTanggalIso menolak tanggal yang tidak ada", () => {
    expect(parseTanggalIso("2026-02-29")).toBeNull();
    expect(parseTanggalIso("2028-02-29")).toEqual([2028, 2, 29]);
  });
});

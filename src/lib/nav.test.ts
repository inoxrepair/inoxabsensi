import { describe, expect, it } from "vitest";
import { ADMIN_NAV, KATEGORI_ADMIN_NAV } from "@/lib/nav";

describe("pengelompokan menu admin", () => {
  it("semua item ADMIN_NAV punya tepat satu kategori", () => {
    expect(ADMIN_NAV.length).toBeGreaterThan(0);
    for (const item of ADMIN_NAV) {
      expect(item.kategori).toBeDefined();
      expect(KATEGORI_ADMIN_NAV).toContain(item.kategori);
    }
  });

  it("kelima kategori masing-masing dipakai minimal satu item", () => {
    expect(KATEGORI_ADMIN_NAV).toHaveLength(5);
    for (const kategori of KATEGORI_ADMIN_NAV) {
      expect(
        ADMIN_NAV.some((item) => item.kategori === kategori),
      ).toBe(true);
    }
  });
});

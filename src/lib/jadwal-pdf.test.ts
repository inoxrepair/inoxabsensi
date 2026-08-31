import { describe, expect, it } from "vitest";
import { buatJadwalPdf } from "./jadwal-pdf";

describe("buatJadwalPdf", () => {
  it("menghasilkan file PDF valid", async () => {
    const bytes = await buatJadwalPdf({
      dates: ["2026-08-01", "2026-08-02"],
      rows: [{ userId: "u1", nama: "Rizky", cabang: "Manado", hari: [{ shiftId: "p", seragamId: null, seragam: null }, null] }],
      shifts: [{ id: "p", nama: "Pagi", mulai: "09.00", selesai: "17.00" }],
      title: "Jadwal iNox",
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("membagi rentang panjang tanpa gagal", async () => {
    const dates = Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    const bytes = await buatJadwalPdf({ dates, rows: [], shifts: [], title: "Jadwal Bulanan" });
    expect(bytes.length).toBeGreaterThan(500);
  });
});

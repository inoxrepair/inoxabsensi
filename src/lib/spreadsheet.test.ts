import { describe, expect, it } from "vitest";
import { csvCell, datesInMonth, kodeShift, parseCsv, parseTanggalSpreadsheet, renderSpreadsheetCsv, shiftByKode, updateJadwalCell } from "./spreadsheet";

describe("spreadsheet", () => {
  it("menghasilkan kode shift singkat", () => {
    expect(kodeShift("Pagi")).toBe("P");
    expect(kodeShift("Siang")).toBe("S");
    expect(kodeShift("Full")).toBe("F");
  });
  it("mencari shift dari kode", () => {
    const shifts = [{ id: "p", nama: "Pagi", mulai: "09", selesai: "17" }];
    expect(shiftByKode("P", shifts)?.id).toBe("p");
    expect(shiftByKode("L", shifts)).toBeNull();
    expect(shiftByKode("O", shifts)).toBeNull();
  });
  it("format export memakai tanggal panjang dan O untuk Off", () => {
    const csv = renderSpreadsheetCsv(["2026-07-28"], [{ userId: "u", nama: "A", cabang: "C", hari: [null] }], []);
    expect(csv).toContain("28 Juli 2026");
    expect(csv).toContain(";O");
  });
  it("parse tanggal panjang Indonesia", () => {
    expect(parseTanggalSpreadsheet("28 Juli 2026")).toBe("2026-07-28");
    expect(parseTanggalSpreadsheet("2026-07-28")).toBe("2026-07-28");
  });
  it("parse CSV escaped", () => {
    expect(parseCsv('Nama;Catatan\r\nA;"x;y"')).toEqual([["Nama", "Catatan"], ["A", "x;y"]]);
  });
  it("escape CSV", () => expect(csvCell("a;b")).toBe('"a;b"'));
  it("menghasilkan jumlah tanggal bulan", () => {
    expect(datesInMonth(2028, 2)).toHaveLength(29);
  });
  it("mengubah editor dan preview dari data yang sama", () => {
    const rows = [{ userId: "u1", nama: "A", cabang: "C", hari: [null, null] }];
    const updated = updateJadwalCell(rows, ["2026-08-01", "2026-08-02"], "u1", "2026-08-02", "p", "s", "Seragam A");
    expect(updated[0].hari[1]).toEqual({ shiftId: "p", seragamId: "s", seragam: "Seragam A" });
    const libur = updateJadwalCell(updated, ["2026-08-01", "2026-08-02"], "u1", "2026-08-02", "", "", null);
    expect(libur[0].hari[1]).toBeNull();
  });
});

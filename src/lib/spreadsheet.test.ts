import { describe, expect, it } from "vitest";
import { csvCell, datesInMonth, kodeShift, parseCsv, shiftByKode } from "./spreadsheet";

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
  });
  it("parse CSV escaped", () => {
    expect(parseCsv('Nama;Catatan\r\nA;"x;y"')).toEqual([["Nama", "Catatan"], ["A", "x;y"]]);
  });
  it("escape CSV", () => expect(csvCell("a;b")).toBe('"a;b"'));
  it("menghasilkan jumlah tanggal bulan", () => {
    expect(datesInMonth(2028, 2)).toHaveLength(29);
  });
});

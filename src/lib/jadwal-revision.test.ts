import { describe, expect, it } from "vitest";
import { parseSnapshot, type SnapshotJadwal } from "./jadwal-revision";

describe("jadwal revision", () => {
  it("parse snapshot valid", () => {
    const s: SnapshotJadwal = { userIds: ["u"], dates: ["2026-08-01"], rows: [] };
    expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
  });
  it("menolak snapshot rusak", () => {
    expect(() => parseSnapshot("{}")).toThrow(/tidak valid/);
  });
});

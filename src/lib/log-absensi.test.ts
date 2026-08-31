import { describe, expect, it } from "vitest";
import { editAbsensiSkema } from "./log-absensi";

describe("editAbsensiSkema", () => {
  const valid = {
    id: "a1",
    tanggal: "2026-08-31",
    status: "telat",
    masuk: "09:15",
    keluar: "17:00",
    catatan: "Koreksi manual",
  };

  it("mengubah jam browser menjadi menit", () => {
    const hasil = editAbsensiSkema.safeParse(valid);
    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.masuk).toBe(555);
      expect(hasil.data.keluar).toBe(1020);
    }
  });

  it("menerima status izin tanpa jam", () => {
    expect(
      editAbsensiSkema.safeParse({ ...valid, status: "izin", masuk: "", keluar: "" }).success,
    ).toBe(true);
  });

  it("menolak hadir tanpa jam masuk", () => {
    expect(
      editAbsensiSkema.safeParse({ ...valid, status: "hadir", masuk: "" }).success,
    ).toBe(false);
  });

  it("menolak jam keluar tanpa jam masuk", () => {
    expect(
      editAbsensiSkema.safeParse({ ...valid, masuk: "", keluar: "17:00" }).success,
    ).toBe(false);
  });

  it("menolak tanggal tidak valid", () => {
    expect(editAbsensiSkema.safeParse({ ...valid, tanggal: "2026-02-31" }).success).toBe(false);
  });
});

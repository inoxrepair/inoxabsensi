import { describe, expect, it } from "vitest";
import { selJadwalSkema, shiftSkema, TOLERANSI_MAKS } from "./jadwal";

function formShift(ubah: Record<string, string | undefined> = {}) {
  return {
    nama: "Pagi",
    jamMulai: "09.00",
    jamSelesai: "17.00",
    toleransiMenit: "10",
    ...ubah,
  };
}

function galatShift(ubah: Record<string, string | undefined>) {
  const h = shiftSkema.safeParse(formShift(ubah));
  return h.success ? null : h.error.issues[0].message;
}

describe("shiftSkema", () => {
  it("mengubah jam ke menit sejak tengah malam", () => {
    const h = shiftSkema.safeParse(formShift());
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data).toEqual({
        nama: "Pagi",
        mulaiMenit: 540,
        selesaiMenit: 1020,
        toleransiMenit: 10,
      });
    }
  });

  it("menerima pemisah titik dua", () => {
    const h = shiftSkema.safeParse(
      formShift({ jamMulai: "14:00", jamSelesai: "22:00" }),
    );
    if (h.success) expect(h.data.mulaiMenit).toBe(840);
  });

  it("menerima shift lintas tengah malam", () => {
    const h = shiftSkema.safeParse(
      formShift({ nama: "Malam", jamMulai: "22.00", jamSelesai: "06.00" }),
    );
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data.mulaiMenit).toBe(1320);
      expect(h.data.selesaiMenit).toBe(360);
    }
  });

  it("menolak jam mulai sama dengan selesai", () => {
    expect(galatShift({ jamSelesai: "09.00" })).toMatch(/tidak boleh sama/);
  });

  it("menolak format jam salah", () => {
    expect(galatShift({ jamMulai: "9" })).toMatch(/HH\.MM/);
    expect(galatShift({ jamMulai: "25.00" })).toMatch(/HH\.MM/);
    expect(galatShift({ jamMulai: "09.75" })).toMatch(/HH\.MM/);
  });

  it("menolak nama terlalu pendek", () => {
    expect(galatShift({ nama: "P" })).toMatch(/minimal 2 karakter/);
  });

  it("toleransi 0 diperbolehkan", () => {
    const h = shiftSkema.safeParse(formShift({ toleransiMenit: "0" }));
    expect(h.success).toBe(true);
  });

  it("menolak toleransi negatif atau di atas batas", () => {
    expect(galatShift({ toleransiMenit: "-1" })).toMatch(/negatif/);
    expect(galatShift({ toleransiMenit: String(TOLERANSI_MAKS + 1) })).toMatch(
      /maksimal/,
    );
  });
});

describe("selJadwalSkema", () => {
  it("string kosong pada shiftId berarti libur", () => {
    const h = selJadwalSkema.safeParse({
      userId: "u1",
      tanggal: "2026-08-31",
      shiftId: "",
    });
    expect(h.success).toBe(true);
    if (h.success) expect(h.data.shiftId).toBeNull();
  });

  it("meneruskan shiftId yang terisi", () => {
    const h = selJadwalSkema.safeParse({
      userId: "u1",
      tanggal: "2026-08-31",
      shiftId: "s1",
      seragam: "Seragam A",
    });
    if (h.success) {
      expect(h.data.shiftId).toBe("s1");
      expect(h.data.seragam).toBe("Seragam A");
    }
  });

  it("seragam kosong menjadi null", () => {
    const h = selJadwalSkema.safeParse({
      userId: "u1",
      tanggal: "2026-08-31",
      shiftId: "s1",
      seragam: "   ",
    });
    if (h.success) expect(h.data.seragam).toBeNull();
  });

  it("menolak format tanggal salah", () => {
    const h = selJadwalSkema.safeParse({
      userId: "u1",
      tanggal: "31-08-2026",
      shiftId: "",
    });
    expect(h.success).toBe(false);
  });
});

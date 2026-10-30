import { describe, expect, it } from "vitest";
import {
  editAbsensiSkema,
  gabungCatatanEdit,
  hitungMenitTelatKoreksi,
  hitungSnapshotKoreksi,
  statusEfektif,
} from "./log-absensi";

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

describe("hitungMenitTelatKoreksi", () => {
  const shift = { mulaiMenit: 540, toleransiMenit: 10 };

  it("mengosongkan menit telat bila status diubah menjadi hadir", () => {
    expect(hitungMenitTelatKoreksi("hadir", 560, shift)).toBe(0);
  });

  it("menghitung ulang setelah toleransi", () => {
    expect(hitungMenitTelatKoreksi("telat", 565, shift)).toBe(15);
  });

  it("menjadi nol bila jam koreksi masih dalam toleransi", () => {
    expect(hitungMenitTelatKoreksi("telat", 550, shift)).toBe(0);
  });

  it("mengosongkan menit telat untuk izin/alpa/libur", () => {
    expect(hitungMenitTelatKoreksi("izin", null, shift)).toBe(0);
    expect(hitungMenitTelatKoreksi("alpa", null, shift)).toBe(0);
    expect(hitungMenitTelatKoreksi("libur", null, shift)).toBe(0);
  });
});

describe("statusEfektif", () => {
  const shift = { mulaiMenit: 540, toleransiMenit: 10 };

  it("meluruskan telat dalam toleransi menjadi hadir", () => {
    expect(statusEfektif("telat", 550, shift)).toBe("hadir");
  });

  it("mempertahankan telat yang terbukti lewat toleransi", () => {
    expect(statusEfektif("telat", 565, shift)).toBe("telat");
  });

  it("tidak mengubah hadir sebagai pembolehan manual", () => {
    expect(statusEfektif("hadir", 565, shift)).toBe("hadir");
  });

  it("tidak mengubah status non-kehadiran", () => {
    expect(statusEfektif("izin", null, shift)).toBe("izin");
    expect(statusEfektif("alpa", null, shift)).toBe("alpa");
  });
});

describe("hitungSnapshotKoreksi", () => {
  const shift = { mulaiMenit: 540, toleransiMenit: 10 };
  it("identitas kotor = toleransi + telat untuk telat", () => {
    const s = hitungSnapshotKoreksi("telat", 565, shift);
    expect(s).toEqual({ menitTelat: 15, menitToleransi: 10, menitKotor: 25 });
    expect(s.menitKotor).toBe(s.menitToleransi + s.menitTelat);
  });
  it("fleksibel dan non-telat semuanya nol", () => {
    expect(hitungSnapshotKoreksi("telat", 565, shift, "fleksibel")).toEqual({
      menitTelat: 0,
      menitToleransi: 0,
      menitKotor: 0,
    });
    expect(hitungSnapshotKoreksi("hadir", 565, shift)).toEqual({
      menitTelat: 0,
      menitToleransi: 0,
      menitKotor: 0,
    });
  });
});

describe("gabungCatatanEdit", () => {
  it("tidak menumpuk suffix pada edit berulang", () => {
    expect(gabungCatatanEdit("Koreksi · Diedit manual.")).toBe(
      "Koreksi · Diedit manual.",
    );
    expect(gabungCatatanEdit(null)).toBe("Diedit manual.");
    expect(gabungCatatanEdit("Alasan")).toBe("Alasan · Diedit manual.");
  });
});

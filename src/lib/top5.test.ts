import { describe, expect, it } from "vitest";
import {
  BATAS_AWAL_MASUK_MENIT,
  bagiPodium,
  hariValid,
  hitungHariPeriode,
  hitungPeringkat,
  type BarisAbsensiTop,
  type HariTerjadwal,
  type PeringkatTop,
} from "@/lib/top5";

const MULAI = 510; // 08.30
const hari = (userId: string, tanggal: string): HariTerjadwal => ({
  userId,
  tanggal,
  mulaiMenit: MULAI,
});
const absen = (
  userId: string,
  tanggal: string,
  masukMenit: number | null,
  keluarMenit: number | null = 1020,
  extra: Partial<BarisAbsensiTop> = {},
): BarisAbsensiTop => ({
  userId,
  tanggal,
  masukMenit,
  keluarMenit,
  editedBy: null,
  catatan: null,
  ...extra,
});

describe("hariValid", () => {
  it("masuk 30 menit sebelum shift valid (batas bawah)", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI - 30))).toBe(true);
  });

  it("masuk 31 menit sebelum shift tidak valid (terlalu awal)", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI - 31))).toBe(false);
  });

  it("masuk tepat jam mulai valid", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI))).toBe(true);
  });

  it("masuk 1 menit setelah jam mulai tidak valid (telat)", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI + 1))).toBe(false);
  });

  it("tanpa absen pulang tidak valid", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI, null))).toBe(false);
  });

  it("tanpa absen masuk tidak valid", () => {
    expect(hariValid(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", null))).toBe(false);
  });

  it("log diedit admin menghanguskan hari", () => {
    expect(
      hariValid(
        hari("u1", "2026-11-10"),
        absen("u1", "2026-11-10", MULAI, 1020, { editedBy: "admin-1" }),
      ),
    ).toBe(false);
    expect(
      hariValid(
        hari("u1", "2026-11-10"),
        absen("u1", "2026-11-10", MULAI, 1020, { catatan: "Diedit manual." }),
      ),
    ).toBe(false);
  });

  it("batas awal 30 menit", () => {
    expect(BATAS_AWAL_MASUK_MENIT).toBe(30);
  });
});

describe("hitungPeringkat", () => {
  const pengguna = [
    { id: "u1", nama: "Fajri", foto: null, cabang: "KWSN" },
    { id: "u2", nama: "Elsi", foto: null, cabang: "KWSN" },
    { id: "u3", nama: "Dedi", foto: null, cabang: "MDC" },
  ];

  it("urut jumlah hari valid turun (bukan rasio), lalu nama", () => {
    const hariList = [
      hari("u1", "2026-11-10"), hari("u1", "2026-11-11"),
      hari("u2", "2026-11-10"), hari("u2", "2026-11-11"),
      hari("u3", "2026-11-10"), hari("u3", "2026-11-11"), hari("u3", "2026-11-12"),
    ];
    const absensi = [
      absen("u1", "2026-11-10", MULAI), absen("u1", "2026-11-11", MULAI),
      absen("u2", "2026-11-10", MULAI), absen("u2", "2026-11-11", MULAI + 5),
      absen("u3", "2026-11-10", MULAI), absen("u3", "2026-11-11", MULAI),
    ];
    // u1: 2 valid; u3: 2 valid dari 3 terjadwal; u2: 1 valid.
    // Rasio lama menaruh u1 (2/2) di atas u3 (2/3); aturan baru (jumlah
    // hari valid, penyebut periode sama) menaruh keduanya sejajar lalu
    // nama naik: Dedi sebelum Fajri.
    const hasil = hitungPeringkat(hariList, absensi, pengguna, 31);
    expect(hasil.map((h) => h.userId)).toEqual(["u3", "u1", "u2"]);
    expect(hasil[0].skor).toBeCloseTo(2 / 31);
    expect(hasil[2].skor).toBeCloseTo(1 / 31);
  });

  it("yang jadwalnya sedikit tidak terdongkrak rasionya", () => {
    // Kasus Ucok: Irfan 7/17 (41%) vs Julianer 17/31 (55%). Dengan
    // penyebut periode (31), Irfan 7/31 tetap di bawah Julianer 17/31.
    const penggunaKasus = [
      { id: "irfan", nama: "Irfan", foto: null, cabang: "SDNKG" },
      { id: "julianer", nama: "Julianer", foto: null, cabang: "KWSN" },
    ];
    const tanggal = Array.from({ length: 31 }, (_, i) =>
      `2026-11-${String(i + 1).padStart(2, "0")}`,
    );
    const hariList = [
      ...tanggal.slice(0, 17).map((t) => hari("irfan", t)),
      ...tanggal.map((t) => hari("julianer", t)),
    ];
    const absensi = [
      ...tanggal.slice(0, 7).map((t) => absen("irfan", t, MULAI)),
      ...tanggal.slice(0, 17).map((t) => absen("julianer", t, MULAI)),
    ];
    const hasil = hitungPeringkat(hariList, absensi, penggunaKasus, 31);
    expect(hasil.map((h) => h.userId)).toEqual(["julianer", "irfan"]);
    expect(hasil[0].valid).toBe(17);
    expect(hasil[1].valid).toBe(7);
  });

  it("hitungHariPeriode: 28/10–27/11 = 31 hari", () => {
    expect(hitungHariPeriode("2026-10-28", "2026-11-27")).toBe(31);
    expect(hitungHariPeriode("2026-11-10", "2026-11-10")).toBe(1);
  });

  it("karyawan tanpa hari terjadwal tidak masuk peringkat", () => {
    const hasil = hitungPeringkat(
      [hari("u1", "2026-11-10")],
      [absen("u1", "2026-11-10", MULAI)],
      pengguna,
      31,
    );
    expect(hasil.map((h) => h.userId)).toEqual(["u1"]);
  });

  it("maksimal 10 orang", () => {
    const banyak = Array.from({ length: 12 }, (_, i) => ({
      id: `u${i}`,
      nama: `Karyawan ${i}`,
      foto: null,
      cabang: null,
    }));
    const hariList = banyak.map((p) => hari(p.id, "2026-11-10"));
    const absensi = banyak.map((p) => absen(p.id, "2026-11-10", MULAI));
    expect(hitungPeringkat(hariList, absensi, banyak, 31)).toHaveLength(10);
  });
});

describe("bagiPodium", () => {
  const buat = (n: number): PeringkatTop[] =>
    Array.from({ length: n }, (_, i) => ({
      userId: `u${i + 1}`,
      nama: `Karyawan ${i + 1}`,
      foto: null,
      cabang: null,
      valid: 10 - i,
      total: 10,
      skor: (10 - i) / 10,
    }));

  it("3 orang: podium 2-1-3, sisanya kosong", () => {
    const { podium, sisanya } = bagiPodium(buat(3));
    expect(podium.map((p) => p.rank)).toEqual([2, 1, 3]);
    expect(podium.map((p) => p.item.userId)).toEqual(["u2", "u1", "u3"]);
    expect(sisanya).toEqual([]);
  });

  it("5 orang: podium 2-1-3, sisanya peringkat 4-5", () => {
    const { podium, sisanya } = bagiPodium(buat(5));
    expect(podium.map((p) => p.rank)).toEqual([2, 1, 3]);
    expect(sisanya.map((p) => p.userId)).toEqual(["u4", "u5"]);
  });

  it("kurang dari 3 orang: podium hanya yang ada", () => {
    expect(bagiPodium(buat(1)).podium.map((p) => p.rank)).toEqual([1]);
    expect(bagiPodium(buat(2)).podium.map((p) => p.rank)).toEqual([2, 1]);
    expect(bagiPodium([]).podium).toEqual([]);
  });
});

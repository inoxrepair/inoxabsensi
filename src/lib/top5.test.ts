import { describe, expect, it } from "vitest";
import {
  BATAS_AWAL_MASUK_MENIT,
  bagiPodium,
  cacheTop5Segar,
  hariValid,
  hitungPeringkat,
  hitungPeringkatPerbaikan,
  hitungPoinHari,
  TTL_CACHE_TOP5_MS,
  type BarisAbsensiTop,
  type HariTerjadwal,
  type MasukanPerbaikan,
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

describe("hitungPoinHari", () => {
  it("30 menit lebih awal = 60 poin (30 dasar + 30 awal)", () => {
    expect(
      hitungPoinHari(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI - 30)),
    ).toBe(60);
  });

  it("tepat jam mulai = 30 poin", () => {
    expect(
      hitungPoinHari(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI)),
    ).toBe(30);
  });

  it("terlambat 25 menit = -25 poin (denda menit mentah)", () => {
    expect(
      hitungPoinHari(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI + 25)),
    ).toBe(-25);
  });

  it("terlambat tetap kena denda walau tanpa absen pulang", () => {
    expect(
      hitungPoinHari(
        hari("u1", "2026-11-10"),
        absen("u1", "2026-11-10", MULAI + 25, null),
      ),
    ).toBe(-25);
  });

  it("log diedit = 0 poin, tanpa bonus maupun denda", () => {
    expect(
      hitungPoinHari(
        hari("u1", "2026-11-10"),
        absen("u1", "2026-11-10", MULAI + 25, 1020, { editedBy: "admin-1" }),
      ),
    ).toBe(0);
    expect(
      hitungPoinHari(
        hari("u1", "2026-11-10"),
        absen("u1", "2026-11-10", MULAI - 30, 1020, { editedBy: "admin-1" }),
      ),
    ).toBe(0);
  });

  it("terlalu awal (31 menit) = 0 poin", () => {
    expect(
      hitungPoinHari(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI - 31)),
    ).toBe(0);
  });

  it("tanpa absen pulang di hari tepat waktu = 0 poin", () => {
    expect(
      hitungPoinHari(hari("u1", "2026-11-10"), absen("u1", "2026-11-10", MULAI, null)),
    ).toBe(0);
  });
});

describe("hitungPeringkat", () => {
  const pengguna = [
    { id: "u1", nama: "Fajri", foto: null, cabang: "KWSN" },
    { id: "u2", nama: "Elsi", foto: null, cabang: "KWSN" },
    { id: "u3", nama: "Dedi", foto: null, cabang: "MDC" },
  ];

  it("urut poin turun, lalu nama", () => {
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
    // u1: 2 hari tepat waktu = 60; u3: 2 hari tepat waktu = 60 (seri, nama
    // naik: Dedi sebelum Fajri); u2: 30 + (-5) = 25.
    const hasil = hitungPeringkat(hariList, absensi, pengguna);
    expect(hasil.map((h) => h.userId)).toEqual(["u3", "u1", "u2"]);
    expect(hasil[0].skor).toBe(60);
    expect(hasil[1].skor).toBe(60);
    expect(hasil[2].skor).toBe(25);
  });

  it("contoh Ucok: 30 menit awal lalu telat 25 menit = 35 poin", () => {
    const hasil = hitungPeringkat(
      [hari("u1", "2026-11-10"), hari("u1", "2026-11-11")],
      [
        absen("u1", "2026-11-10", MULAI - 30),
        absen("u1", "2026-11-11", MULAI + 25),
      ],
      pengguna,
    );
    expect(hasil[0].skor).toBe(35);
    expect(hasil[0].valid).toBe(1);
  });

  it("yang jadwalnya sedikit tidak terdongkrak rasionya", () => {
    // Kasus Ucok: Irfan 7/17 (41%) vs Julianer 17/31 (55%). Dengan skor
    // poin (tepat waktu = 30/hari), Irfan 210 tetap di bawah Julianer 510.
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
    const hasil = hitungPeringkat(hariList, absensi, penggunaKasus);
    expect(hasil.map((h) => h.userId)).toEqual(["julianer", "irfan"]);
    expect(hasil[0].valid).toBe(17);
    expect(hasil[0].skor).toBe(510);
    expect(hasil[1].valid).toBe(7);
    expect(hasil[1].skor).toBe(210);
  });

  it("karyawan tanpa hari terjadwal tidak masuk peringkat", () => {
    const hasil = hitungPeringkat(
      [hari("u1", "2026-11-10")],
      [absen("u1", "2026-11-10", MULAI)],
      pengguna,
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
    expect(hitungPeringkat(hariList, absensi, banyak)).toHaveLength(10);
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
      skor: (10 - i) * 30,
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

describe("hitungPeringkatPerbaikan", () => {
  const buat = (
    userId: string,
    nama: string,
    jumlahTransaksi: number,
  ): MasukanPerbaikan => ({
    userId,
    nama,
    foto: null,
    cabang: "KWSN",
    jumlahTransaksi,
  });

  it("urut poin turun, lalu nama; 1 perbaikan = 1 poin", () => {
    const hasil = hitungPeringkatPerbaikan([
      buat("u1", "Fajri", 12),
      buat("u2", "Elsi", 24),
      buat("u3", "Dedi", 12),
    ]);
    expect(hasil.map((h) => h.userId)).toEqual(["u2", "u3", "u1"]);
    expect(hasil.map((h) => h.skor)).toEqual([24, 12, 12]);
  });

  it("satu nota dengan 2 perbaikan = 2 poin (per item, bukan per nota)", () => {
    // jumlahTransaksi sudah menghitung per item/baris: 2 baris pada nota
    // yang sama masuk sebagai 2, bukan 1.
    const hasil = hitungPeringkatPerbaikan([buat("u1", "Fajri", 2)]);
    expect(hasil[0].skor).toBe(2);
  });

  it("hanya yang poinnya > 0 yang masuk peringkat", () => {
    const hasil = hitungPeringkatPerbaikan([
      buat("u1", "Fajri", 5),
      buat("u2", "Elsi", 0),
    ]);
    expect(hasil.map((h) => h.userId)).toEqual(["u1"]);
  });

  it("maksimal 10 orang", () => {
    const banyak = Array.from({ length: 12 }, (_, i) =>
      buat(`u${i}`, `Karyawan ${i}`, 12 - i),
    );
    expect(hitungPeringkatPerbaikan(banyak)).toHaveLength(10);
  });
});

describe("cacheTop5Segar", () => {
  it("TTL cache 5 menit", () => {
    expect(TTL_CACHE_TOP5_MS).toBe(5 * 60 * 1000);
  });

  it("segar bila belum 5 menit", () => {
    expect(cacheTop5Segar(0, 4 * 60 * 1000 + 59 * 1000)).toBe(true);
  });

  it("kedaluwarsa tepat di 5 menit", () => {
    expect(cacheTop5Segar(0, 5 * 60 * 1000)).toBe(false);
  });

  it("kedaluwarsa bila sudah lewat 5 menit", () => {
    expect(cacheTop5Segar(0, 6 * 60 * 1000)).toBe(false);
  });
});

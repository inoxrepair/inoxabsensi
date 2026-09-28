import { describe, expect, it } from "vitest";
import {
  bacaRentang,
  daftarTanggal,
  keadaanHarian,
  labelPeriode,
  labelRentang,
  periodeTerakhir,
  periodeValid,
  persenKehadiran,
  rekapPerKaryawan,
  rentangPeriode,
  shiftFull,
  SIMBOL_HARI,
  SIMBOL_STATUS,
  tanggalValid,
  totalRekap,
  type CatatanAbsensi,
  type JadwalHarian,
} from "./rekap";

function catatan(ubah: Partial<CatatanAbsensi> = {}): CatatanAbsensi {
  return {
    userId: "u1",
    tanggal: "2026-08-01",
    status: "hadir",
    masukMenit: 540,
    keluarMenit: 1020,
    menitTelat: 0,
    kekuranganMenit: 0,
    ...ubah,
  };
}

describe("rekapPerKaryawan", () => {
  it("menghitung status dan jam kerja", () => {
    const peta = rekapPerKaryawan([
      catatan(),
      catatan({ status: "telat", masukMenit: 560, menitTelat: 10 }),
      catatan({ status: "izin", masukMenit: null, keluarMenit: null }),
    ]);
    const u = peta.get("u1")!;
    expect(u.hadir).toBe(2);
    expect(u.telat).toBe(1);
    expect(u.izin).toBe(1);
    expect(u.alpa).toBe(0);
    // 480 + 460 menit.
    expect(u.menitKerja).toBe(940);
  });

  it("mengakumulasi menit telat lintas hari", () => {
    const peta = rekapPerKaryawan([
      catatan({
        status: "telat",
        menitTelat: 15,
        menitToleransi: 10,
        menitKotor: 25,
      }),
      catatan({
        status: "telat",
        menitTelat: 7,
        menitToleransi: 10,
        menitKotor: 17,
      }),
      catatan({
        status: "hadir",
        menitTelat: 0,
        menitToleransi: 4,
        menitKotor: 4,
      }),
    ]);
    const u = peta.get("u1")!;
    expect(u.telat).toBe(2);
    expect(u.hadir).toBe(3);
    expect(u.menitTelat).toBe(22);
    expect(u.menitToleransi).toBe(24);
    expect(u.menitKotor).toBe(46);
  });

  it("memisahkan tiap karyawan", () => {
    const peta = rekapPerKaryawan([
      catatan({ userId: "a" }),
      catatan({ userId: "b", status: "alpa", masukMenit: null, keluarMenit: null }),
    ]);
    expect(peta.size).toBe(2);
    expect(peta.get("a")!.hadir).toBe(1);
    expect(peta.get("b")!.alpa).toBe(1);
  });

  it("status libur tidak menambah hitungan apa pun", () => {
    const peta = rekapPerKaryawan([
      catatan({ status: "libur", masukMenit: null, keluarMenit: null }),
    ]);
    const u = peta.get("u1")!;
    expect(u.hadir + u.telat + u.izin + u.alpa).toBe(0);
    expect(u.menitKerja).toBe(0);
  });

  it("check-in tanpa check-out dihitung belumKeluar, bukan jam kerja", () => {
    const peta = rekapPerKaryawan([catatan({ keluarMenit: null })]);
    const u = peta.get("u1")!;
    expect(u.belumKeluar).toBe(1);
    expect(u.menitKerja).toBe(0);
    expect(u.hadir).toBe(1);
  });

  it("shift lewat tengah malam tetap positif", () => {
    // 22.00 -> 06.00 = 8 jam.
    const peta = rekapPerKaryawan([
      catatan({ masukMenit: 1320, keluarMenit: 360 }),
    ]);
    expect(peta.get("u1")!.menitKerja).toBe(480);
  });

  it("menjumlahkan beberapa cycle tetapi tetap satu hari hadir", () => {
    const peta = rekapPerKaryawan([
      catatan({
        cycles: [
          { masukMenit: 480, keluarMenit: 600 },
          { masukMenit: 720, keluarMenit: 900 },
        ],
      }),
    ]);
    expect(peta.get("u1")).toMatchObject({ hadir: 1, menitKerja: 300 });
  });

  it("daftar kosong menghasilkan peta kosong", () => {
    expect(rekapPerKaryawan([]).size).toBe(0);
  });
});

describe("keadaanHarian", () => {
  const rentang = ["2026-08-01", "2026-08-02", "2026-08-03"];

  it("memetakan status absensi per karyawan per tanggal", () => {
    const peta = keadaanHarian(
      [
        catatan({ userId: "a", tanggal: "2026-08-01", status: "hadir" }),
        catatan({ userId: "a", tanggal: "2026-08-02", status: "telat" }),
        catatan({ userId: "b", tanggal: "2026-08-01", status: "izin" }),
      ],
      [],
      rentang,
    );
    expect(peta.get("a")?.get("2026-08-01")).toBe("hadir");
    expect(peta.get("a")?.get("2026-08-02")).toBe("telat");
    expect(peta.get("b")?.get("2026-08-01")).toBe("izin");
  });

  it("hari berjadwal tanpa absensi dianggap alpa", () => {
    const peta = keadaanHarian(
      [],
      [{ userId: "a", tanggal: "2026-08-03", shiftNama: "Pagi" }],
      rentang,
    );
    expect(peta.get("a")?.get("2026-08-03")).toBe("alpa");
  });

  it("hari tanpa baris jadwal sama sekali dianggap off", () => {
    const peta = keadaanHarian([catatan({ tanggal: "2026-08-05" })], [], rentang);
    expect(peta.get("u1")?.get("2026-08-02")).toBe("off");
    expect(peta.get("u1")?.get("2026-08-03")).toBe("off");
  });

  it("hari berjadwal tanpa shift dianggap off", () => {
    const peta = keadaanHarian(
      [],
      [{ userId: "a", tanggal: "2026-08-02", shiftNama: null }],
      rentang,
    );
    expect(peta.get("a")?.get("2026-08-02")).toBe("off");
  });

  it("absen yang tercatat menimpa hasil dari jadwal", () => {
    const jadwal: JadwalHarian[] = [
      { userId: "a", tanggal: "2026-08-01", shiftNama: "Pagi" },
    ];
    const peta = keadaanHarian(
      [catatan({ userId: "a", tanggal: "2026-08-01", status: "hadir" })],
      jadwal,
      rentang,
    );
    expect(peta.get("a")?.get("2026-08-01")).toBe("hadir");
  });

  it("setiap tanggal rentang terisi untuk karyawan yang punya data", () => {
    const peta = keadaanHarian([catatan({ tanggal: "2026-08-01" })], [], rentang);
    for (const t of rentang) {
      expect(peta.get("u1")?.has(t)).toBe(true);
    }
  });

  it("tanpa data dan tanpa rentang menghasilkan peta kosong", () => {
    expect(keadaanHarian([], [], []).size).toBe(0);
  });
});

describe("shiftFull", () => {
  it("mengenali shift Full tanpa peduli huruf besar/kecil dan spasi", () => {
    expect(shiftFull("Full")).toBe(true);
    expect(shiftFull("full")).toBe(true);
    expect(shiftFull(" full ")).toBe(true);
  });

  it("menolak shift lain dan nilai kosong", () => {
    expect(shiftFull("Pagi")).toBe(false);
    expect(shiftFull("Siang")).toBe(false);
    expect(shiftFull(null)).toBe(false);
    expect(shiftFull(undefined)).toBe(false);
    expect(shiftFull("")).toBe(false);
  });
});

describe("daftarTanggal", () => {
  it("mencakup kedua ujung rentang", () => {
    expect(daftarTanggal({ dari: "2026-08-01", sampai: "2026-08-03" })).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("rentang satu hari menghasilkan satu elemen", () => {
    expect(daftarTanggal({ dari: "2026-08-07", sampai: "2026-08-07" })).toEqual([
      "2026-08-07",
    ]);
  });

  it("melintasi batas bulan dan tahun", () => {
    expect(
      daftarTanggal({ dari: "2025-12-30", sampai: "2026-01-02" }),
    ).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("menangani Februari kabisat", () => {
    const t = daftarTanggal({ dari: "2028-02-27", sampai: "2028-03-01" });
    expect(t).toEqual(["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]);
  });
});

describe("SIMBOL_STATUS", () => {
  it("mempunyai simbol unik untuk tiap status", () => {
    const simbol = Object.values(SIMBOL_STATUS);
    expect(new Set(simbol).size).toBe(simbol.length);
  });
});

describe("SIMBOL_HARI", () => {
  it("membedakan off dari status absensi", () => {
    const simbol = Object.values(SIMBOL_HARI);
    expect(new Set(simbol).size).toBe(simbol.length);
    expect(SIMBOL_HARI.off).toBe("O");
  });
});

describe("totalRekap", () => {
  it("menjumlahkan seluruh baris", () => {
    const peta = rekapPerKaryawan([
      catatan({ userId: "a", menitToleransi: 3, menitKotor: 3 }),
      catatan({
        userId: "b",
        status: "telat",
        menitTelat: 12,
        menitToleransi: 10,
        menitKotor: 22,
      }),
    ]);
    const t = totalRekap([...peta.values()]);
    expect(t.hadir).toBe(2);
    expect(t.telat).toBe(1);
    expect(t.menitKerja).toBe(960);
    expect(t.menitTelat).toBe(12);
    expect(t.menitToleransi).toBe(13);
    expect(t.menitKotor).toBe(25);
  });

  it("array kosong menghasilkan nol", () => {
    expect(totalRekap([])).toEqual({
      hadir: 0,
      telat: 0,
      izin: 0,
      alpa: 0,
      menitKerja: 0,
      menitTelat: 0,
      menitToleransi: 0,
      menitKotor: 0,
      kekuranganMenit: 0,
    });
  });
});

describe("persenKehadiran", () => {
  const dasar = {
    izin: 0,
    alpa: 0,
    menitKerja: 0,
    menitTelat: 0,
    menitToleransi: 0,
    menitKotor: 0,
    kekuranganMenit: 0,
  };

  it("telat tetap dihitung hadir", () => {
    expect(persenKehadiran({ hadir: 10, telat: 2, ...dasar })).toBe(100);
  });

  it("menghitung proporsi terhadap total hari", () => {
    expect(
      persenKehadiran({ ...dasar, hadir: 8, telat: 1, izin: 1, alpa: 1 }),
    ).toBe(80);
  });

  it("tanpa data menghasilkan 0, bukan NaN", () => {
    expect(persenKehadiran({ hadir: 0, telat: 0, ...dasar })).toBe(0);
  });

  it("membulatkan ke bilangan bulat", () => {
    expect(persenKehadiran({ ...dasar, hadir: 1, telat: 0, alpa: 2 })).toBe(33);
  });
});

describe("periodeValid", () => {
  it("menerima format yyyy-mm yang sah", () => {
    expect(periodeValid("2026-08")).toBe(true);
    expect(periodeValid("2026-01")).toBe(true);
    expect(periodeValid("2026-12")).toBe(true);
  });

  it("menolak bulan di luar 1-12 dan format lain", () => {
    for (const buruk of ["2026-00", "2026-13", "2026-8", "26-08", "2026", ""]) {
      expect(periodeValid(buruk)).toBe(false);
    }
  });
});

describe("labelPeriode", () => {
  it("menerjemahkan ke nama bulan Indonesia", () => {
    expect(labelPeriode("2026-08")).toBe("Agustus 2026");
    expect(labelPeriode("2026-01")).toBe("Januari 2026");
  });

  it("nilai tidak valid dikembalikan apa adanya", () => {
    expect(labelPeriode("bukan")).toBe("bukan");
  });
});

describe("periodeTerakhir", () => {
  it("mundur dalam tahun yang sama", () => {
    expect(periodeTerakhir("2026-08", 3)).toEqual([
      "2026-08",
      "2026-07",
      "2026-06",
    ]);
  });

  it("melewati batas tahun dengan benar", () => {
    expect(periodeTerakhir("2026-02", 4)).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
      "2025-11",
    ]);
  });

  it("semua hasil berformat valid", () => {
    for (const p of periodeTerakhir("2026-01", 24)) {
      expect(periodeValid(p)).toBe(true);
    }
  });
});

describe("tanggalValid", () => {
  it("menerima tanggal yang ada", () => {
    expect(tanggalValid("2026-08-31")).toBe(true);
    expect(tanggalValid("2028-02-29")).toBe(true); // kabisat
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(tanggalValid("2026-02-30")).toBe(false);
    expect(tanggalValid("2026-04-31")).toBe(false);
    expect(tanggalValid("2027-02-29")).toBe(false); // bukan kabisat
  });

  it("menolak format & bulan salah", () => {
    for (const buruk of ["2026-13-01", "2026-00-10", "31-08-2026", "2026-8-1", ""]) {
      expect(tanggalValid(buruk)).toBe(false);
    }
  });
});

describe("rentangPeriode", () => {
  it("mencakup hari pertama sampai terakhir", () => {
    expect(rentangPeriode("2026-08")).toEqual({
      dari: "2026-08-01",
      sampai: "2026-08-31",
    });
  });

  it("menangani bulan 30 hari dan Februari kabisat", () => {
    expect(rentangPeriode("2026-09").sampai).toBe("2026-09-30");
    expect(rentangPeriode("2028-02").sampai).toBe("2028-02-29");
    expect(rentangPeriode("2027-02").sampai).toBe("2027-02-28");
  });
});

describe("bacaRentang", () => {
  const bulan = "2026-08";

  it("memakai rentang kustom bila kedua tanggal sah", () => {
    expect(bacaRentang({ dari: "2026-08-05", sampai: "2026-08-20" }, bulan)).toEqual(
      { dari: "2026-08-05", sampai: "2026-08-20", kustom: true },
    );
  });

  it("menukar tanggal yang terbalik", () => {
    const r = bacaRentang({ dari: "2026-08-20", sampai: "2026-08-05" }, bulan);
    expect(r.dari).toBe("2026-08-05");
    expect(r.sampai).toBe("2026-08-20");
  });

  it("rentang satu hari diperbolehkan", () => {
    const r = bacaRentang({ dari: "2026-08-07", sampai: "2026-08-07" }, bulan);
    expect(r).toEqual({ dari: "2026-08-07", sampai: "2026-08-07", kustom: true });
  });

  it("melintasi bulan dan tahun", () => {
    const r = bacaRentang({ dari: "2025-12-25", sampai: "2026-01-05" }, bulan);
    expect(r.kustom).toBe(true);
    expect(r.dari).toBe("2025-12-25");
  });

  it("jatuh ke periode bulanan bila salah satu tanggal tidak sah", () => {
    const r = bacaRentang(
      { dari: "2026-08-05", sampai: "2026-02-31", periode: "2026-07" },
      bulan,
    );
    expect(r).toEqual({ dari: "2026-07-01", sampai: "2026-07-31", kustom: false });
  });

  it("jatuh ke bulan berjalan bila query kosong", () => {
    expect(bacaRentang({}, bulan)).toEqual({
      dari: "2026-08-01",
      sampai: "2026-08-31",
      kustom: false,
    });
  });

  it("mengabaikan tanggal yang hanya terisi separuh", () => {
    expect(bacaRentang({ dari: "2026-08-05" }, bulan).kustom).toBe(false);
    expect(bacaRentang({ sampai: "2026-08-05" }, bulan).kustom).toBe(false);
  });
});

describe("labelRentang", () => {
  it("periode bulanan memakai nama bulan", () => {
    expect(
      labelRentang({ dari: "2026-08-01", sampai: "2026-08-31", kustom: false }),
    ).toBe("Agustus 2026");
  });

  it("rentang kustom menampilkan kedua tanggal", () => {
    expect(
      labelRentang({ dari: "2026-08-05", sampai: "2026-08-20", kustom: true }),
    ).toBe("2026-08-05 s.d. 2026-08-20");
  });
});

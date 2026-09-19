import { describe, expect, it } from "vitest";
import {
  folderKaryawan,
  hitungBulan,
  kelompokkanArsip,
  MAKS_BULAN_ARSIP,
  namaAman,
  namaArsip,
  namaBulanan,
  periodeDari,
  rentangTerlaluPanjang,
} from "./arsip";

describe("periodeDari", () => {
  it("mengambil tahun dan bulan", () => {
    expect(periodeDari("2026-08-15")).toBe("2026-08");
    expect(periodeDari("2026-01-01")).toBe("2026-01");
  });
});

describe("hitungBulan", () => {
  it("menghitung bulan dalam rentang yang sama", () => {
    expect(hitungBulan("2026-08", "2026-08")).toBe(1);
  });

  it("melintasi tahun", () => {
    expect(hitungBulan("2025-11", "2026-02")).toBe(4);
  });

  it("satu tahun penuh", () => {
    expect(hitungBulan("2026-01", "2026-12")).toBe(12);
  });
});

describe("rentangTerlaluPanjang", () => {
  it("menolak rentang melebihi batas", () => {
    expect(rentangTerlaluPanjang("2026-01-01", "2027-06-30")).toBe(true);
  });

  it("menerima rentang di dalam batas", () => {
    expect(rentangTerlaluPanjang("2026-01-01", "2026-12-31")).toBe(false);
  });

  it("menghormati batas kustom", () => {
    expect(rentangTerlaluPanjang("2026-01-01", "2026-03-31", 2)).toBe(true);
    expect(rentangTerlaluPanjang("2026-01-01", "2026-02-28", 2)).toBe(false);
  });

  it("batas default adalah dua belas bulan", () => {
    expect(MAKS_BULAN_ARSIP).toBe(12);
  });
});

describe("namaAman", () => {
  it("mengganti spasi dengan tanda hubung", () => {
    expect(namaAman("Budi Santoso")).toBe("Budi-Santoso");
  });

  it("membuang karakter yang tidak aman untuk nama file", () => {
    expect(namaAman("Budi/Santoso: 01")).toBe("Budi-Santoso-01");
    expect(namaAman("../../etc/passwd")).toBe("etc-passwd");
  });

  it("merapikan tanda hubung berulang", () => {
    expect(namaAman("Budi   --  Santoso")).toBe("Budi-Santoso");
  });

  it("memberi nama cadangan bila kosong", () => {
    expect(namaAman("   ")).toBe("tanpa-nama");
    expect(namaAman("!!!")).toBe("tanpa-nama");
  });
});

describe("folderKaryawan", () => {
  it("memakai nama saja bila username tidak ada", () => {
    expect(folderKaryawan("Budi Santoso")).toBe("Budi-Santoso");
  });

  it("menambahkan username agar unik", () => {
    expect(folderKaryawan("Budi Santoso", "budi.01")).toBe("Budi-Santoso-budi-01");
  });

  it("tidak menggandakan bila username sama dengan nama", () => {
    expect(folderKaryawan("budi", "budi")).toBe("budi");
  });
});

describe("namaBulanan", () => {
  it("memakai format yyyy-mm.pdf", () => {
    expect(namaBulanan("2026-08")).toBe("2026-08.pdf");
  });
});

describe("namaArsip", () => {
  it("memuat kedua tanggal", () => {
    expect(namaArsip("2026-08-01", "2026-08-31")).toBe(
      "arsip-absensi-2026-08-01-sd-2026-08-31.zip",
    );
  });
});

describe("kelompokkanArsip", () => {
  const baris = [
    { userId: "a", nama: "Budi", username: "budi", periode: "2026-09" },
    { userId: "a", nama: "Budi", username: "budi", periode: "2026-08" },
    { userId: "b", nama: "Siti", username: null, periode: "2026-08" },
  ];

  it("mengelompokkan per karyawan dengan periode unik", () => {
    const peta = kelompokkanArsip(baris);
    expect(peta.size).toBe(2);
    expect([...peta.get("a")!.periode]).toEqual(["2026-08", "2026-09"]);
    expect([...peta.get("b")!.periode]).toEqual(["2026-08"]);
  });

  it("menyimpan nama dan username", () => {
    const peta = kelompokkanArsip(baris);
    expect(peta.get("a")!.nama).toBe("Budi");
    expect(peta.get("b")!.username).toBeNull();
  });

  it("periode tidak dobel walau baris berulang", () => {
    const peta = kelompokkanArsip([
      { userId: "a", nama: "Budi", username: null, periode: "2026-08" },
      { userId: "a", nama: "Budi", username: null, periode: "2026-08" },
    ]);
    expect(peta.get("a")!.periode.size).toBe(1);
  });

  it("daftar kosong menghasilkan peta kosong", () => {
    expect(kelompokkanArsip([]).size).toBe(0);
  });
});
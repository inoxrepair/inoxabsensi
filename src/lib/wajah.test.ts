import { describe, expect, it } from "vitest";
import {
  AMBANG_COCOK,
  bacaEmbedding,
  bacaStatusWajah,
  cariKecocokan,
  embeddingValid,
  jarakEuclidean,
  PANJANG_EMBEDDING,
  pesanWajah,
  rataEmbedding,
} from "./wajah";

/** Vektor 128 angka dengan nilai awal tertentu, untuk data uji. */
function vektor(nilai: number): number[] {
  return new Array(PANJANG_EMBEDDING).fill(nilai);
}

/** Vektor dasar lalu satu posisi digeser; meniru wajah yang sedikit berbeda. */
function geser(dasar: number[], posisi: number, delta: number): number[] {
  const salinan = [...dasar];
  salinan[posisi] += delta;
  return salinan;
}

describe("embeddingValid", () => {
  it("menerima vektor 128 angka", () => {
    expect(embeddingValid(vektor(0.1))).toBe(true);
  });

  it("menolak panjang salah", () => {
    expect(embeddingValid([1, 2, 3])).toBe(false);
    expect(embeddingValid(new Array(127).fill(0))).toBe(false);
  });

  it("menolak angka tidak valid dan bukan array", () => {
    const rusak = vektor(0.1);
    rusak[5] = Number.NaN;
    expect(embeddingValid(rusak)).toBe(false);
    expect(embeddingValid("bukan vektor")).toBe(false);
    expect(embeddingValid(null)).toBe(false);
  });
});

describe("bacaEmbedding", () => {
  it("membaca JSON yang valid", () => {
    expect(bacaEmbedding(JSON.stringify(vektor(0.2)))).toEqual(vektor(0.2));
  });

  it("mengembalikan null untuk nilai kosong atau rusak", () => {
    expect(bacaEmbedding(null)).toBeNull();
    expect(bacaEmbedding(undefined)).toBeNull();
    expect(bacaEmbedding("")).toBeNull();
    expect(bacaEmbedding("{bukan json")).toBeNull();
    expect(bacaEmbedding(JSON.stringify([1, 2, 3]))).toBeNull();
  });
});

describe("jarakEuclidean", () => {
  it("nol untuk vektor identik", () => {
    expect(jarakEuclidean(vektor(0.5), vektor(0.5))).toBe(0);
  });

  it("menghitung jarak yang benar", () => {
    expect(jarakEuclidean([0, 0], [3, 4])).toBe(5);
  });

  it("menolak panjang berbeda", () => {
    expect(() => jarakEuclidean([1, 2], [1])).toThrow();
  });
});

describe("cariKecocokan", () => {
  const acuan = vektor(0.5);

  it("menemukan kandidat terdekat dan menandai cocok", () => {
    const hasil = cariKecocokan(acuan, [
      { id: "jauh", embedding: geser(acuan, 0, 5) },
      { id: "dekat", embedding: geser(acuan, 0, 0.1) },
    ]);
    expect(hasil.userId).toBe("dekat");
    expect(hasil.cocok).toBe(true);
    expect(hasil.jarak).toBeGreaterThan(0);
  });

  it("menolak kecocokan di atas ambang", () => {
    const hasil = cariKecocokan(acuan, [
      { id: "a", embedding: geser(acuan, 0, 10) },
    ]);
    expect(hasil.cocok).toBe(false);
    expect(hasil.userId).toBe("a");
  });

  it("menghormati ambang kustom", () => {
    const kandidat = [{ id: "a", embedding: geser(acuan, 0, 0.3) }];
    expect(cariKecocokan(acuan, kandidat, 0.2).cocok).toBe(false);
    expect(cariKecocokan(acuan, kandidat, 0.5).cocok).toBe(true);
  });

  it("tanpa kandidat menghasilkan tidak cocok", () => {
    const hasil = cariKecocokan(acuan, []);
    expect(hasil).toEqual({ userId: null, jarak: null, cocok: false });
  });

  it("ambang default longgar mengakomodasi variasi kecil", () => {
    expect(AMBANG_COCOK).toBeGreaterThan(0.5);
  });
});

describe("rataEmbedding", () => {
  it("menghasilkan rata-rata tiap dimensi", () => {
    const hasil = rataEmbedding([vektor(0.2), vektor(0.4)]);
    expect(hasil).not.toBeNull();
    expect(hasil![0]).toBeCloseTo(0.3, 5);
  });

  it("menolak daftar kosong", () => {
    expect(rataEmbedding([])).toBeNull();
  });

  it("menolak sampel yang panjangnya tidak 128", () => {
    expect(rataEmbedding([[1, 2, 3]])).toBeNull();
  });

  it("satu sampel mengembalikan sampel itu sendiri", () => {
    expect(rataEmbedding([vektor(0.7)])).toEqual(vektor(0.7));
  });
});

describe("bacaStatusWajah", () => {
  it("menerima status yang dikenal", () => {
    expect(bacaStatusWajah("cocok")).toBe("cocok");
    expect(bacaStatusWajah("tidak_cocok")).toBe("tidak_cocok");
    expect(bacaStatusWajah("belum_daftar")).toBe("belum_daftar");
  });

  it("mengembalikan null untuk nilai lain", () => {
    expect(bacaStatusWajah("ngawur")).toBeNull();
    expect(bacaStatusWajah(null)).toBeNull();
  });
});

describe("pesanWajah", () => {
  it("memberi pesan berbeda per status", () => {
    const pesan = [
      pesanWajah("cocok"),
      pesanWajah("tidak_cocok"),
      pesanWajah("belum_daftar"),
      pesanWajah(null),
    ];
    expect(new Set(pesan).size).toBe(pesan.length);
  });

  it("menegaskan absensi tetap tercatat saat wajah tidak cocok", () => {
    expect(pesanWajah("tidak_cocok")).toContain("tetap tercatat");
  });
});
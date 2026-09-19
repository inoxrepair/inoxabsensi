/**
 * Pencocokan wajah berbasis jarak vektor (face descriptor), murni tanpa I/O
 * supaya bisa diuji langsung. Browser hanya bertugas menghasilkan vektor;
 * keputusan cocok atau tidak selalu dihitung di server.
 */

export const PANJANG_EMBEDDING = 128;

/**
 * Ambang jarak Euclidean. Model face-api menganggap dua wajah cocok bila
 * jaraknya di bawah 0,6. Dipakai sedikit lebih longgar dari 0,5 standar
 * karena ekspresi, kacamata, dan pencahayaan toko sangat bervariasi.
 */
export const AMBANG_COCOK = 0.55;

/** Vektor wajah tidak valid bila panjangnya bukan 128 atau ada angka aneh. */
export function embeddingValid(nilai: unknown): nilai is number[] {
  return (
    Array.isArray(nilai) &&
    nilai.length === PANJANG_EMBEDDING &&
    nilai.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/** Parse JSON kolom database menjadi vektor; null bila rusak/tidak valid. */
export function bacaEmbedding(teks: string | null | undefined): number[] | null {
  if (!teks) return null;
  try {
    const parsed = JSON.parse(teks);
    return embeddingValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Jarak Euclidean dua vektor berukuran sama. */
export function jarakEuclidean(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Panjang vektor wajah tidak sama.");
  }
  let jumlah = 0;
  for (let i = 0; i < a.length; i++) {
    const selisih = a[i] - b[i];
    jumlah += selisih * selisih;
  }
  return Math.sqrt(jumlah);
}

export type Kandidat = { id: string; embedding: number[] };

export type HasilCocok = {
  /** Kandidat dengan jarak terkecil, null bila tidak ada kandidat valid. */
  userId: string | null;
  /** Jarak ke kandidat terdekat; null bila tidak ada kandidat. */
  jarak: number | null;
  cocok: boolean;
};

/**
 * Cari pemilik wajah terdekat dari daftar kandidat. Ambang terpisah agar
 * keputusan mudah diubah tanpa mengutak-atik rumus jarak.
 */
export function cariKecocokan(
  probe: number[],
  kandidat: Kandidat[],
  ambang: number = AMBANG_COCOK,
): HasilCocok {
  let terdekatId: string | null = null;
  let terdekatJarak: number | null = null;

  for (const k of kandidat) {
    const jarak = jarakEuclidean(probe, k.embedding);
    if (terdekatJarak === null || jarak < terdekatJarak) {
      terdekatJarak = jarak;
      terdekatId = k.id;
    }
  }

  return {
    userId: terdekatId,
    jarak: terdekatJarak,
    cocok: terdekatJarak !== null && terdekatJarak <= ambang,
  };
}

/**
 * Rata-ratakan beberapa sampel wajah menjadi satu vektor acuan. Dipakai saat
 * pendaftaran agar variasi kecil (kacamata, sudut) sudah tercakup.
 */
export function rataEmbedding(sampel: number[][]): number[] | null {
  if (sampel.length === 0) return null;
  const panjang = sampel[0].length;
  if (panjang !== PANJANG_EMBEDDING) return null;
  if (!sampel.every((s) => embeddingValid(s))) return null;

  const hasil = new Array<number>(panjang).fill(0);
  for (const s of sampel) {
    for (let i = 0; i < panjang; i++) hasil[i] += s[i];
  }
  return hasil.map((n) => n / sampel.length);
}

export const STATUS_WAJAH = ["cocok", "tidak_cocok", "belum_daftar"] as const;
export type StatusWajah = (typeof STATUS_WAJAH)[number];

export const LABEL_STATUS_WAJAH: Record<StatusWajah, string> = {
  cocok: "Wajah cocok",
  tidak_cocok: "Wajah tidak cocok",
  belum_daftar: "Wajah belum didaftarkan",
};

export function bacaStatusWajah(nilai: string | null | undefined): StatusWajah | null {
  return STATUS_WAJAH.includes(nilai as StatusWajah)
    ? (nilai as StatusWajah)
    : null;
}

/** Ringkas hasil verifikasi untuk pesan ke karyawan. */
export function pesanWajah(status: StatusWajah | null): string {
  switch (status) {
    case "cocok":
      return "Wajah terverifikasi.";
    case "tidak_cocok":
      return "Wajah tidak dikenali. Absensi tetap tercatat dan akan ditinjau admin.";
    case "belum_daftar":
      return "Wajah belum didaftarkan. Hubungi admin untuk mendaftarkan wajah.";
    default:
      return "Verifikasi wajah tidak dijalankan.";
  }
}

/** Kehadiran dari wajah tidak mengubah status absensi; hanya catatan audit. */
export type KonteksWajah = {
  status: StatusWajah | null;
  jarak: number | null;
};

export const WARNA_STATUS_WAJAH: Record<StatusWajah, string> = {
  cocok: "text-status-hadir",
  tidak_cocok: "text-status-alpa",
  belum_daftar: "text-muted",
};
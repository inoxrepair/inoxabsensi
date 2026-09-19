/**
 * Logika arsip absensi yang murni (tanpa I/O) supaya bisa diuji langsung:
 * pengelompokan bulan, penamaan folder/file aman, dan batas rentang.
 */

/** Rentang maksimum arsip agar server tidak kehabisan memori/timeout. */
export const MAKS_BULAN_ARSIP = 12;

/** Periode "yyyy-mm" dari sebuah tanggal "yyyy-mm-dd". */
export function periodeDari(tanggal: string): string {
  return tanggal.slice(0, 7);
}

/** Jumlah bulan inklusif antara dua periode "yyyy-mm". */
export function hitungBulan(dari: string, sampai: string): number {
  const [t1, b1] = dari.split("-").map(Number);
  const [t2, b2] = sampai.split("-").map(Number);
  return (t2 * 12 + b2) - (t1 * 12 + b1) + 1;
}

/** Rentang melebihi batas aman arsip? */
export function rentangTerlaluPanjang(
  dari: string,
  sampai: string,
  maks: number = MAKS_BULAN_ARSIP,
): boolean {
  return hitungBulan(periodeDari(dari), periodeDari(sampai)) > maks;
}

/**
 * Ubah teks menjadi komponen nama yang aman dipakai sebagai folder/file.
 * Slash, titik dua, dan karakter aneh lain diganti tanda hubung agar tidak
 * bisa keluar dari struktur ZIP.
 */
export function namaAman(teks: string): string {
  const bersih = teks
    .normalize("NFKD")
    .replace(/[^\w\- ]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return bersih || "tanpa-nama";
}

/** Nama folder karyawan di dalam ZIP; username ditambahkan bila ada. */
export function folderKaryawan(nama: string, username?: string | null): string {
  const dasar = namaAman(nama);
  const akun = username ? namaAman(username) : "";
  return akun && akun !== dasar ? `${dasar}-${akun}` : dasar;
}

/** Nama file PDF bulanan, mis. "2026-08.pdf". */
export function namaBulanan(periode: string): string {
  return `${periode}.pdf`;
}

/** Nama file ZIP arsip. */
export function namaArsip(dari: string, sampai: string): string {
  return `arsip-absensi-${dari}-sd-${sampai}.zip`;
}

export type BarisArsip = {
  userId: string;
  nama: string;
  username: string | null;
  periode: string;
};

/**
 * Kelompokkan baris per karyawan lalu per bulan, dengan urutan stabil agar
 * hasil ZIP selalu sama untuk data yang sama.
 */
export function kelompokkanArsip(
  baris: BarisArsip[],
): Map<string, { nama: string; username: string | null; periode: Set<string> }> {
  const peta = new Map<
    string,
    { nama: string; username: string | null; periode: Set<string> }
  >();

  for (const b of baris) {
    const entri =
      peta.get(b.userId) ??
      { nama: b.nama, username: b.username, periode: new Set<string>() };
    entri.periode.add(b.periode);
    peta.set(b.userId, entri);
  }

  // Urutkan periode di setiap karyawan supaya arsip konsisten.
  for (const entri of peta.values()) {
    entri.periode = new Set([...entri.periode].sort());
  }

  return peta;
}
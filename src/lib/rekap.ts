import type { StatusAbsensi } from "@/lib/domain";
import { durasiMenit } from "@/lib/waktu";

/**
 * Agregasi rekap absensi. Fungsi murni tanpa I/O supaya bisa diuji langsung;
 * query database ada di halaman yang memakainya.
 */

export type CatatanAbsensi = {
  userId: string;
  /** Tanggal lokal "yyyy-mm-dd"; dipakai kolom per tanggal. */
  tanggal: string;
  status: StatusAbsensi;
  masukMenit: number | null;
  keluarMenit: number | null;
  /** Menit keterlambatan tersimpan saat check-in. */
  menitTelat: number;
  kekuranganMenit: number;
  cycles?: { masukMenit: number; keluarMenit: number | null }[];
};

export type BarisRekap = {
  userId: string;
  hadir: number;
  telat: number;
  izin: number;
  alpa: number;
  /** Menit kerja dari pasangan masuk-keluar yang lengkap. */
  menitKerja: number;
  /** Akumulasi keterlambatan seluruh hari pada periode. */
  menitTelat: number;
  kekuranganMenit: number;
  /** Hari yang check-in tapi belum check-out. */
  belumKeluar: number;
};

function barisKosong(userId: string): BarisRekap {
  return {
    userId,
    hadir: 0,
    telat: 0,
    izin: 0,
    alpa: 0,
    menitKerja: 0,
    menitTelat: 0,
    kekuranganMenit: 0,
    belumKeluar: 0,
  };
}

/**
 * Kelompokkan catatan per karyawan. Status "libur" diabaikan karena tidak
 * memengaruhi hitungan kehadiran maupun jam kerja.
 */
export function rekapPerKaryawan(
  catatan: CatatanAbsensi[],
): Map<string, BarisRekap> {
  const peta = new Map<string, BarisRekap>();

  for (const c of catatan) {
    const baris = peta.get(c.userId) ?? barisKosong(c.userId);

    if (c.status !== "libur") {
      baris[c.status] += 1;
      // Telat adalah subset kehadiran, bukan kategori yang menghilangkan hadir.
      // Kolom hadir menunjukkan seluruh hari karyawan benar-benar datang.
      if (c.status === "telat") baris.hadir += 1;
    }
    baris.menitTelat += c.menitTelat;
    baris.kekuranganMenit += c.kekuranganMenit;

    const cycles = c.cycles?.length
      ? c.cycles
      : c.masukMenit !== null
        ? [{ masukMenit: c.masukMenit, keluarMenit: c.keluarMenit }]
        : [];
    for (const cycle of cycles) {
      if (cycle.keluarMenit !== null) {
        baris.menitKerja += durasiMenit(cycle.masukMenit, cycle.keluarMenit);
      } else {
        baris.belumKeluar += 1;
      }
    }

    peta.set(c.userId, baris);
  }

  return peta;
}

/**
 * Peta status per karyawan per tanggal, dipakai kolom harian pada rekap.
 * Tanggal yang sama tidak mungkin dobel karena Absensi unik pada
 * (userId, tanggal); pemanggilan tetap aman bila data tidak konsisten.
 */
export function petaStatusHarian(
  catatan: CatatanAbsensi[],
): Map<string, Map<string, StatusAbsensi>> {
  const peta = new Map<string, Map<string, StatusAbsensi>>();

  for (const c of catatan) {
    const perUser = peta.get(c.userId) ?? new Map<string, StatusAbsensi>();
    perUser.set(c.tanggal, c.status);
    peta.set(c.userId, perUser);
  }

  return peta;
}

/** Simbol ringkas status untuk kolom tanggal yang sempit. */
export const SIMBOL_STATUS: Record<StatusAbsensi, string> = {
  hadir: "H",
  telat: "T",
  alpa: "A",
  izin: "I",
  libur: "L",
};

/** Label panjang status, dipakai legend dan sel Excel yang lebih lega. */
export const LABEL_STATUS: Record<StatusAbsensi, string> = {
  hadir: "Hadir",
  telat: "Telat",
  alpa: "Alpa",
  izin: "Izin",
  libur: "Libur",
};

/** Daftar tanggal "yyyy-mm-dd" inklusif dari `dari` sampai `sampai`. */
export function daftarTanggal(r: Rentang): string[] {
  const jumlah = Math.max(0, selisihHariIso(r.dari, r.sampai));
  return Array.from({ length: jumlah + 1 }, (_, i) => geserHariIso(r.dari, i));
}

const SEHARI_MS_REKAP = 86_400_000;

function keUtcRekap(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function geserHariIso(iso: string, hari: number): string {
  return new Date(keUtcRekap(iso) + hari * SEHARI_MS_REKAP)
    .toISOString()
    .slice(0, 10);
}

function selisihHariIso(a: string, b: string): number {
  return Math.round((keUtcRekap(b) - keUtcRekap(a)) / SEHARI_MS_REKAP);
}

export type TotalRekap = {
  hadir: number;
  telat: number;
  izin: number;
  alpa: number;
  menitKerja: number;
  menitTelat: number;
  kekuranganMenit: number;
};

export function totalRekap(baris: BarisRekap[]): TotalRekap {
  return baris.reduce<TotalRekap>(
    (a, b) => ({
      hadir: a.hadir + b.hadir,
      telat: a.telat + b.telat,
      izin: a.izin + b.izin,
      alpa: a.alpa + b.alpa,
      menitKerja: a.menitKerja + b.menitKerja,
      menitTelat: a.menitTelat + b.menitTelat,
      kekuranganMenit: a.kekuranganMenit + b.kekuranganMenit,
    }),
    { hadir: 0, telat: 0, izin: 0, alpa: 0, menitKerja: 0, menitTelat: 0, kekuranganMenit: 0 },
  );
}

/**
 * `hadir` sudah mencakup hari telat; `telat` hanya subset informasional.
 */
export function persenKehadiran(t: TotalRekap): number {
  const total = t.hadir + t.izin + t.alpa;
  return total === 0 ? 0 : Math.round((t.hadir / total) * 100);
}

/** Periode "yyyy-mm" untuk filter; dibatasi agar tidak menerima input bebas. */
export function periodeValid(nilai: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(nilai)) return false;
  const bulan = Number(nilai.slice(5));
  return bulan >= 1 && bulan <= 12;
}

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "2026-08" -> "Agustus 2026" */
export function labelPeriode(periode: string): string {
  if (!periodeValid(periode)) return periode;
  const [tahun, bulan] = periode.split("-");
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`;
}

/** Daftar periode mundur dari `dari` (format "yyyy-mm"), termasuk dirinya. */
export function periodeTerakhir(dari: string, jumlah: number): string[] {
  const [t0, b0] = dari.split("-").map(Number);
  return Array.from({ length: jumlah }, (_, i) => {
    // Hitung lewat indeks bulan absolut supaya batas tahun aman.
    const indeks = t0 * 12 + (b0 - 1) - i;
    const tahun = Math.floor(indeks / 12);
    const bulan = (indeks % 12) + 1;
    return `${tahun}-${String(bulan).padStart(2, "0")}`;
  });
}

/* -------------------------------------------------------------------------- */
/* Rentang tanggal                                                            */
/* -------------------------------------------------------------------------- */

export type Rentang = { dari: string; sampai: string };

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Validasi "yyyy-mm-dd" termasuk tanggal yang tidak ada, mis. 2026-02-31. */
export function tanggalValid(nilai: string): boolean {
  if (!POLA_TANGGAL.test(nilai)) return false;
  const [y, m, d] = nilai.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini.
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Hari pertama dan terakhir sebuah periode "yyyy-mm". */
export function rentangPeriode(periode: string): Rentang {
  const [y, m] = periode.split("-").map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    dari: `${periode}-01`,
    sampai: `${periode}-${String(akhir).padStart(2, "0")}`,
  };
}

/**
 * Tentukan rentang aktif dari query. Prioritas: rentang kustom bila kedua
 * tanggal sah, lalu periode bulanan, lalu bulan berjalan. Tanggal yang
 * terbalik ditukar otomatis agar tidak menghasilkan hasil kosong.
 */
export function bacaRentang(
  q: { dari?: string; sampai?: string; periode?: string },
  bulanBerjalan: string,
): Rentang & { kustom: boolean } {
  if (q.dari && q.sampai && tanggalValid(q.dari) && tanggalValid(q.sampai)) {
    const [dari, sampai] =
      q.dari <= q.sampai ? [q.dari, q.sampai] : [q.sampai, q.dari];
    return { dari, sampai, kustom: true };
  }

  const periode = q.periode && periodeValid(q.periode) ? q.periode : bulanBerjalan;
  return { ...rentangPeriode(periode), kustom: false };
}

/** Label rentang untuk judul & nama file. */
export function labelRentang(r: Rentang & { kustom: boolean }): string {
  return r.kustom ? `${r.dari} s.d. ${r.sampai}` : labelPeriode(r.dari.slice(0, 7));
}

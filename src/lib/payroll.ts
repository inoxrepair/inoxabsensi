import { z } from "zod";
import { periodeValid } from "@/lib/rekap";

/**
 * Validasi komponen payroll. Nilai diisi manual oleh super admin karena
 * rumus lembur/THR/pajak belum ditetapkan; validasi di sini menjaga agar
 * angka yang masuk database tetap wajar.
 */

/** Batas atas per komponen: menahan salah ketik nol berlebih. */
export const RUPIAH_MAKS = 1_000_000_000;

/**
 * Tarif tunjangan makan per hari hadir (Rp 20.000). Dihitung OTOMATIS dari
 * absensi periode ini — bukan angka yang diisi manual di form payroll
 * (seperti insentif, sumbernya hanya data yang sudah ada).
 */
export const TARIF_TUNJANGAN_MAKAN_PER_HARI = 20_000;

/**
 * Status absensi yang dihitung sebagai satu hari hadir untuk tunjangan
 * makan. Telat tetap dihitung karena karyawan hadir (hanya terlambat);
 * alpa, izin, dan libur/off tidak dihitung.
 */
export function dihitungHadir(status: string): boolean {
  return status === "hadir" || status === "telat";
}

/** Tunjangan makan = tarif × hari hadir. */
export function tunjanganMakan(hariHadir: number): number {
  return Math.max(0, Math.floor(hariHadir)) * TARIF_TUNJANGAN_MAKAN_PER_HARI;
}

/**
 * Tarif potongan telat per menit tercatat (Rp 1.000). Menit telat tercatat
 * sudah dikurangi toleransi shift (Shift.toleransiMenit) saat check-in —
 * mis. toleransi 10 menit, masuk 25 menit terlambat → yang dihitung 15
 * menit → Rp 15.000. Jadi potongan ikut dinamis bila toleransi di definisi
 * shift diubah (berlaku untuk check-in berikutnya; menit yang sudah
 * tercatat tidak berubah karena disimpan sebagai snapshot).
 */
export const TARIF_POTONGAN_TELAT_PER_MENIT = 1_000;

/** Potongan telat = tarif × menit telat tercatat periode ini. */
export function potonganTelat(menitTelat: number): number {
  return Math.max(0, Math.floor(menitTelat)) * TARIF_POTONGAN_TELAT_PER_MENIT;
}

/** FormData mengirim string; terima juga "3.500.000" dan "3 500 000". */
function rupiah(label: string) {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null) return 0;
      if (typeof v !== "string") return v;
      const teks = v.trim();
      if (teks === "") return 0;

      // Titik hanya diterima sebagai pemisah ribuan yang konsisten.
      // Dengan begitu "3.500.000" sah, tetapi "1000.5" tidak diam-diam
      // berubah menjadi 10005. Koma selalu ditolak karena rupiah integer.
      const valid = /^-?(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?: \d{3})+)$/.test(
        teks,
      );
      return valid ? Number(teks.replace(/[.\s]/g, "")) : Number.NaN;
    },
    z
      .number({ error: `${label} harus berupa angka.` })
      .int(`${label} harus bilangan bulat.`)
      .min(0, `${label} tidak boleh negatif.`)
      .max(RUPIAH_MAKS, `${label} melebihi batas wajar.`),
  );
}

export const payrollSkema = z.object({
  userId: z.string().min(1, "Karyawan tidak valid."),
  periode: z
    .string()
    .refine(periodeValid, "Periode tidak valid."),
  gajiPokok: rupiah("Gaji pokok"),
  tunjangan: rupiah("Tunjangan"),
  kasbon: rupiah("Kasbon"),
  // Insentif SENGAJA tidak ada di skema ini: satu-satunya sumber nilai
  // insentif adalah tabel Insentif (hasil sinkron inox.my.id) yang dibaca
  // halaman Payroll. Form payroll tidak boleh menulisnya, supaya tidak
  // ada dua sumber kebenaran yang bisa berbeda.
  // Potongan telat juga SENGAJA tidak ada: dihitung otomatis dari menit
  // telat tercatat × Rp 1.000 (lihat potonganTelat di bawah).
});

export type DataPayroll = z.output<typeof payrollSkema>;

export type KomponenGaji = {
  gajiPokok: number;
  tunjangan: number;
  /** Dihitung otomatis dari hari hadir; tidak diisi manual. */
  tunjanganMakan: number;
  /** Dihitung otomatis dari menit telat tercatat × Rp 1.000; tidak diisi manual. */
  potonganTelat: number;
  kasbon: number;
  insentif: number;
};

/** Satu baris payroll per karyawan (dipakai tabel web + laporan PDF). */
export type BarisPayroll = KomponenGaji & {
  userId: string;
  nama: string;
  cabang: string;
  /** Jumlah hari berstatus hadir/telat pada periode ini. */
  hariHadir: number;
  /** Total menit telat tercatat periode ini (sudah dikurangi toleransi shift). */
  menitTelatRekap: number;
  /** Sisa kasbon disetujui periode ini (jumlah - terbayar). */
  kasbonDisetujuiSisa: number;
};

/** Gaji bersih yang diterima karyawan (termasuk tunjangan makan & insentif). */
export function takeHomePay(k: KomponenGaji): number {
  return (
    k.gajiPokok + k.tunjangan + k.tunjanganMakan + k.insentif - k.potonganTelat - k.kasbon
  );
}

/**
 * Potongan dan kasbon boleh melebihi pendapatan secara teknis, tapi itu
 * hampir selalu salah input. Dipakai untuk memberi peringatan, bukan menolak.
 */
export function melebihiPendapatan(k: KomponenGaji): boolean {
  return (
    k.potonganTelat + k.kasbon >
    k.gajiPokok + k.tunjangan + k.tunjanganMakan
  );
}

export function totalPayroll(baris: KomponenGaji[]) {
  return baris.reduce<{
    gajiPokok: number;
    tunjangan: number;
    tunjanganMakan: number;
    potonganTelat: number;
    kasbon: number;
    insentif: number;
    diterima: number;
  }>(
    (a, b) => ({
      gajiPokok: a.gajiPokok + b.gajiPokok,
      tunjangan: a.tunjangan + b.tunjangan,
      tunjanganMakan: a.tunjanganMakan + b.tunjanganMakan,
      potonganTelat: a.potonganTelat + b.potonganTelat,
      kasbon: a.kasbon + b.kasbon,
      insentif: a.insentif + b.insentif,
      diterima: a.diterima + takeHomePay(b),
    }),
    { gajiPokok: 0, tunjangan: 0, tunjanganMakan: 0, potonganTelat: 0, kasbon: 0, insentif: 0, diterima: 0 },
  );
}

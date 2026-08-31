import { z } from "zod";
import { periodeValid } from "@/lib/rekap";

/**
 * Validasi komponen payroll. Nilai diisi manual oleh super admin karena
 * rumus lembur/THR/pajak belum ditetapkan; validasi di sini menjaga agar
 * angka yang masuk database tetap wajar.
 */

/** Batas atas per komponen: menahan salah ketik nol berlebih. */
export const RUPIAH_MAKS = 1_000_000_000;

/** FormData mengirim string; terima juga "3.500.000" dan "3 500 000". */
function rupiah(label: string) {
  return z.preprocess(
    (v) => {
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
  potonganTelat: rupiah("Potongan"),
  kasbon: rupiah("Kasbon"),
});

export type DataPayroll = z.output<typeof payrollSkema>;

export type KomponenGaji = {
  gajiPokok: number;
  tunjangan: number;
  potonganTelat: number;
  kasbon: number;
};

/** Gaji bersih yang diterima karyawan. */
export function takeHomePay(k: KomponenGaji): number {
  return k.gajiPokok + k.tunjangan - k.potonganTelat - k.kasbon;
}

/**
 * Potongan dan kasbon boleh melebihi pendapatan secara teknis, tapi itu
 * hampir selalu salah input. Dipakai untuk memberi peringatan, bukan menolak.
 */
export function melebihiPendapatan(k: KomponenGaji): boolean {
  return k.potonganTelat + k.kasbon > k.gajiPokok + k.tunjangan;
}

export function totalPayroll(baris: KomponenGaji[]) {
  return baris.reduce<{
    gajiPokok: number;
    tunjangan: number;
    potonganTelat: number;
    kasbon: number;
    diterima: number;
  }>(
    (a, b) => ({
      gajiPokok: a.gajiPokok + b.gajiPokok,
      tunjangan: a.tunjangan + b.tunjangan,
      potonganTelat: a.potonganTelat + b.potonganTelat,
      kasbon: a.kasbon + b.kasbon,
      diterima: a.diterima + takeHomePay(b),
    }),
    { gajiPokok: 0, tunjangan: 0, potonganTelat: 0, kasbon: 0, diterima: 0 },
  );
}

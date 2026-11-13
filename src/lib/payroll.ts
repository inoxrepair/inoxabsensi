import { z } from "zod";
import { periodeValid } from "@/lib/rekap";
import { durasiMenit } from "@/lib/waktu";

/**
 * Validasi komponen payroll. Nilai diisi manual oleh super admin karena
 * rumus THR/pajak belum ditetapkan; validasi di sini menjaga agar
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

/**
 * Tarif per jam (Rp 12.000). Dipakai untuk lembur (shift terjadwal di atas
 * 8 jam) DAN untuk gaji pokok karyawan shift fleksibel (per jam kerja
 * nyata). Dihitung OTOMATIS — bukan angka yang diisi manual di form
 * payroll. Tarif ini sengaja konstanta dulu; penyesuaian per
 * karyawan/cabang (opsional) menyusul.
 */
export const TARIF_PER_JAM = 12_000;

/** Alias lama: tarif lembur per jam (sama dengan TARIF_PER_JAM). */
export const TARIF_LEMBUR_PER_JAM = TARIF_PER_JAM;

/** Batas jam kerja normal dalam satu shift: di atas ini dihitung lembur. */
export const BATAS_LEMBUR_MENIT = 8 * 60;

/**
 * Durasi shift dalam menit dari jam mulai–selesai definisinya. Shift yang
 * melewati tengah malam (selesai < mulai) dihitung memutar, mis.
 * 20.00–06.00 = 10 jam.
 */
export function durasiShiftMenit(mulaiMenit: number, selesaiMenit: number): number {
  const durasi = selesaiMenit - mulaiMenit;
  return durasi >= 0 ? durasi : durasi + 24 * 60;
}

/**
 * Menit lembur mentah satu hari dari definisi shift: durasi shift di atas
 * 8 jam kerja normal. Hanya shift terjadwal; shift fleksibel tidak
 * dihitung lembur.
 */
export function menitLembur(mulaiMenit: number, selesaiMenit: number, mode: string): number {
  if (mode !== "terjadwal") return 0;
  return Math.max(0, durasiShiftMenit(mulaiMenit, selesaiMenit) - BATAS_LEMBUR_MENIT);
}

/**
 * Menit -> jam dengan pembulatan PER HARI: sisa 30 menit atau lebih
 * dibulatkan ke atas ke jam penuh (pembulatan berlaku mulai 30 menit).
 * Dipakai untuk lembur maupun jam kerja fleksibel.
 */
export function jamDibulatkan(menit: number): number {
  const m = Math.max(0, Math.floor(menit));
  const jam = Math.floor(m / 60);
  return m % 60 >= 30 ? jam + 1 : jam;
}

/**
 * Jam lembur dari menit mentah satu hari (aturan pembulatan yang sama:
 * sisa 30 menit atau lebih dibulatkan ke atas, per hari).
 */
export function jamLembur(menit: number): number {
  return jamDibulatkan(menit);
}

/** Upah per jam = tarif × jam (jam sudah dibulatkan per hari). */
export function upahPerJam(jam: number): number {
  return Math.max(0, Math.floor(jam)) * TARIF_PER_JAM;
}

/** Upah lembur = tarif × jam lembur (jam sudah dibulatkan per hari). */
export function upahLembur(jam: number): number {
  return upahPerJam(jam);
}

/**
 * Menit kerja satu hari dari cycle absen: jumlah (keluar - masuk) semua
 * cycle yang sudah check-out (1–3 cycle diakumulasi, hasil akumulasi
 * inilah durasi final hari itu). Cycle tanpa jam keluar (belum check-out)
 * dilewati karena durasinya belum bisa dihitung.
 */
export function menitKerjaCycle(
  cycles: { masukMenit: number; keluarMenit: number | null }[],
): number {
  let total = 0;
  for (const c of cycles) {
    if (c.keluarMenit === null) continue;
    total += durasiMenit(c.masukMenit, c.keluarMenit);
  }
  return total;
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
  // Lembur juga SENGAJA tidak ada: dihitung otomatis dari shift terjadwal
  // di atas 8 jam × Rp 12.000 (lihat menitLembur/jamLembur/upahLembur).
  // Gaji pokok fleksibel juga SENGAJA tidak ada: dihitung otomatis dari
  // jam kerja nyata hari fleksibel × Rp 12.000 (lihat menitKerjaCycle/
  // jamDibulatkan/upahPerJam) — gaji pokok manual tetap ditambah untuk
  // hari terjadwal.
});

export type DataPayroll = z.output<typeof payrollSkema>;

export type KomponenGaji = {
  gajiPokok: number;
  /**
   * Gaji pokok dari jam kerja hari fleksibel (jam dibulatkan per hari ×
   * Rp 12.000). Dihitung otomatis; tidak diisi manual. Ditambahkan ke
   * gaji pokok manual — untuk karyawan yang sepenuhnya fleksibel, gaji
   * pokok manual diisi 0 supaya tidak dobel.
   */
  gajiPokokFleksibel: number;
  tunjangan: number;
  /** Dihitung otomatis dari hari hadir; tidak diisi manual. */
  tunjanganMakan: number;
  /** Dihitung otomatis dari shift terjadwal di atas 8 jam × Rp 12.000; tidak diisi manual. */
  lembur: number;
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
  /** Total jam lembur (sudah dibulatkan per hari) pada jendela hitung. */
  jamLembur: number;
  /** Total jam kerja hari fleksibel (sudah dibulatkan per hari) pada jendela hitung. */
  jamFleksibel: number;
  /** Sisa kasbon disetujui periode ini (jumlah - terbayar). */
  kasbonDisetujuiSisa: number;
  /** Jumlah transaksi iNOX dalam jendela hitung yang membentuk insentif. */
  insentifTransaksi: number;
};

/** Gaji bersih yang diterima karyawan (termasuk tunjangan makan, lembur, gaji pokok fleksibel & insentif). */
export function takeHomePay(k: KomponenGaji): number {
  return (
    k.gajiPokok + k.gajiPokokFleksibel + k.tunjangan + k.tunjanganMakan + k.lembur + k.insentif - k.potonganTelat - k.kasbon
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
    gajiPokokFleksibel: number;
    tunjangan: number;
    tunjanganMakan: number;
    lembur: number;
    potonganTelat: number;
    kasbon: number;
    insentif: number;
    diterima: number;
  }>(
    (a, b) => ({
      gajiPokok: a.gajiPokok + b.gajiPokok,
      gajiPokokFleksibel: a.gajiPokokFleksibel + b.gajiPokokFleksibel,
      tunjangan: a.tunjangan + b.tunjangan,
      tunjanganMakan: a.tunjanganMakan + b.tunjanganMakan,
      lembur: a.lembur + b.lembur,
      potonganTelat: a.potonganTelat + b.potonganTelat,
      kasbon: a.kasbon + b.kasbon,
      insentif: a.insentif + b.insentif,
      diterima: a.diterima + takeHomePay(b),
    }),
    { gajiPokok: 0, gajiPokokFleksibel: 0, tunjangan: 0, tunjanganMakan: 0, lembur: 0, potonganTelat: 0, kasbon: 0, insentif: 0, diterima: 0 },
  );
}

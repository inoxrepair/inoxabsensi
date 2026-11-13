import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";

/**
 * Pesan informasi (pengumuman) untuk popup setelah absen masuk.
 * File ini murni (tanpa I/O) supaya bisa dipakai form klien; akses
 * database ada di lib/informasi-data.ts.
 */

/** Aksi tombol CTA: tutup popup, buka tautan luar, atau buka halaman aplikasi. */
export const AKSI_CTA = ["tutup", "tautan", "halaman"] as const;
export type AksiCta = (typeof AKSI_CTA)[number];

export const LABEL_AKSI_CTA: Record<AksiCta, string> = {
  tutup: "Tutup popup",
  tautan: "Buka tautan",
  halaman: "Buka halaman aplikasi",
};

/** Halaman aplikasi yang boleh dituju tombol CTA (menu karyawan). */
export const HALAMAN_KARYAWAN = [
  { nilai: "/karyawan/izin", label: "Izin" },
  { nilai: "/karyawan/kasbon", label: "Kasbon" },
  { nilai: "/karyawan/riwayat", label: "Riwayat" },
  { nilai: "/karyawan/profil", label: "Profil" },
] as const;

export type HalamanKaryawan = (typeof HALAMAN_KARYAWAN)[number]["nilai"];

/** Validasi path halaman CTA dari database (bukan salah satu = null). */
export function bacaHalamanKaryawan(nilai: string | null): HalamanKaryawan | null {
  return (HALAMAN_KARYAWAN as readonly { nilai: string }[]).some(
    (h) => h.nilai === nilai,
  )
    ? (nilai as HalamanKaryawan)
    : null;
}

export function bacaAksiCta(nilai: string): AksiCta {
  return (AKSI_CTA as readonly string[]).includes(nilai)
    ? (nilai as AksiCta)
    : "tutup";
}

/** Satu pesan informasi, bentuk yang dikirim ke klien (semua primitif). */
export type InformasiItem = {
  id: string;
  judul: string;
  isi: string;
  ctaLabel: string;
  ctaAksi: AksiCta;
  ctaTautan: string | null;
  ctaHalaman: HalamanKaryawan | null;
  mulaiTanggal: string;
  durasiHari: number;
  aktif: boolean;
  /** Tanggal dibuat "yyyy-mm-dd" (untuk tampilan). */
  dibuatPada: string;
};

/** Tanggal terakhir tampil: mulai + durasi - 1 hari (inklusif). */
export function akhirInformasi(mulaiTanggal: string, durasiHari: number): string {
  const [y, m, d] = mulaiTanggal.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (durasiHari - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Pesan tampil hari ini bila toggle aktif DAN hari ini dalam masa tampil. */
export function apakahInformasiAktif(
  pesan: { aktif: boolean; mulaiTanggal: string; durasiHari: number },
  hariIni: string,
): boolean {
  return (
    pesan.aktif &&
    hariIni >= pesan.mulaiTanggal &&
    hariIni <= akhirInformasi(pesan.mulaiTanggal, pesan.durasiHari)
  );
}

/** Saring pesan yang tampil hari ini, terbaru dulu (sesuai urutan popup). */
export function informasiAktifHariIni<T extends InformasiItem>(
  daftar: T[],
  hariIni: string,
): T[] {
  return daftar
    .filter((p) => apakahInformasiAktif(p, hariIni))
    .sort((a, b) => (a.dibuatPada < b.dibuatPada ? 1 : -1));
}

/** Validasi form Informasi (dipakai server action; id edit dipisah). */
export const informasiSkema = z
  .object({
    judul: z.string().trim().min(1, "Judul wajib diisi.").max(100),
    isi: z.string().trim().min(1, "Isi informasi wajib diisi.").max(1000),
    ctaLabel: z.string().trim().max(30).default("Mengerti"),
    ctaAksi: z.enum(AKSI_CTA),
    ctaTautan: z.string().trim().max(500).optional().default(""),
    ctaHalaman: z.string().trim().max(100).optional().default(""),
    mulaiTanggal: z
      .string()
      .refine(tanggalValid, "Tanggal mulai tidak valid (yyyy-mm-dd)."),
    durasiHari: z.coerce.number().int().min(1).max(365),
    aktif: z.coerce.boolean(),
  })
  .superRefine((nilai, ctx) => {
    if (nilai.ctaAksi === "tautan") {
      if (!nilai.ctaTautan) {
        ctx.addIssue({
          code: "custom",
          path: ["ctaTautan"],
          message: "Tautan wajib diisi bila aksi CTA 'Buka tautan'.",
        });
      } else if (!/^https?:\/\//.test(nilai.ctaTautan)) {
        ctx.addIssue({
          code: "custom",
          path: ["ctaTautan"],
          message: "Tautan harus diawali http:// atau https://.",
        });
      }
    }
    if (
      nilai.ctaAksi === "halaman" &&
      !(HALAMAN_KARYAWAN as readonly { nilai: string }[]).some(
        (h) => h.nilai === nilai.ctaHalaman,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ctaHalaman"],
        message: "Pilih halaman aplikasi tujuan CTA.",
      });
    }
  });

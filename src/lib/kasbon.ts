import { z } from "zod";
import { periodeValid } from "@/lib/rekap";

export const KASBON_MAKS = 50_000_000;

function rupiah(label: string) {
  return z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const teks = v.trim();
      if (teks === "") return 0;
      const valid = /^-?(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?: \d{3})+)$/.test(teks);
      return valid ? Number(teks.replace(/[.\s]/g, "")) : Number.NaN;
    },
    z
      .number({ error: `${label} harus berupa angka.` })
      .int(`${label} harus bilangan bulat.`)
      .min(1, `${label} minimal Rp1.`)
      .max(KASBON_MAKS, `${label} melebihi batas wajar.`),
  );
}

export const ajukanKasbonSkema = z.object({
  jumlah: rupiah("Jumlah kasbon"),
  periode: z
    .string()
    .refine(periodeValid, "Periode tidak valid."),
  keterangan: z
    .string()
    .trim()
    .max(200, "Keterangan maksimal 200 karakter.")
    .optional()
    .transform((v) => v || null),
});

export const prosesKasbonSkema = z.object({
  id: z.string().min(1),
  status: z.enum(["disetujui", "ditolak", "lunas"]),
});

export type DataAjukanKasbon = z.output<typeof ajukanKasbonSkema>;
export type DataProsesKasbon = z.output<typeof prosesKasbonSkema>;

/** Pembayaran kasbon oleh admin untuk kasbon yang sudah disetujui. */
export const bayarKasbonSkema = z.object({
  id: z.string().min(1),
  jumlahBayar: rupiah("Jumlah bayar"),
});

export type DataBayarKasbon = z.output<typeof bayarKasbonSkema>;

/** Sisa yang masih harus dipotong payroll: tidak pernah negatif. */
export function sisaKasbon(kasbon: {
  jumlah: number;
  jumlahTerbayar?: number | null;
}): number {
  return Math.max(0, kasbon.jumlah - (kasbon.jumlahTerbayar ?? 0));
}

/**
 * Total yang boleh ditarik payroll dari daftar kasbon: hanya yang
 * disetujui, dan hanya sisanya (jumlah - terbayar). Pending, ditolak,
 * lunas, dan dibatalkan tidak ikut.
 */
export function totalKasbonUntukPayroll(
  daftar: readonly {
    status: string;
    jumlah: number;
    jumlahTerbayar?: number | null;
  }[],
): number {
  return daftar
    .filter((k) => k.status === "disetujui")
    .reduce((total, k) => total + sisaKasbon(k), 0);
}

/**
 * Status setelah mencatat pembayaran: lunas hanya bila terbayar sudah
 * mencapai jumlah penuh; selain itu tetap disetujui (parsial).
 */
export function statusSetelahBayar(
  jumlah: number,
  terbayarBaru: number,
): "disetujui" | "lunas" {
  return terbayarBaru >= jumlah ? "lunas" : "disetujui";
}

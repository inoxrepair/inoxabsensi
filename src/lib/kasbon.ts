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

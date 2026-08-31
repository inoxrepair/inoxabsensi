import { z } from "zod";

/**
 * Validasi data cabang. Dipisah dari server action supaya bisa diuji
 * tanpa database, dan dipakai ulang bila nanti ada endpoint lain.
 */

/** FormData selalu mengirim string; ubah ke angka dengan pesan yang jelas. */
function angka(pesan: string, min: number, maks: number, pesanRentang: string) {
  return z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v),
    z.number({ error: pesan }).min(min, pesanRentang).max(maks, pesanRentang),
  );
}

/** Batas radius: di bawah 10 m GPS ponsel terlalu berisik untuk dipercaya. */
export const RADIUS_MIN = 10;
export const RADIUS_MAKS = 5000;

export const cabangSkema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama cabang minimal 3 karakter.")
    .max(60, "Nama cabang maksimal 60 karakter."),
  kota: z
    .string()
    .trim()
    .min(3, "Nama kota minimal 3 karakter.")
    .max(40, "Nama kota maksimal 40 karakter."),
  lat: angka(
    "Latitude wajib diisi.",
    -90,
    90,
    "Latitude harus antara -90 dan 90.",
  ),
  lng: angka(
    "Longitude wajib diisi.",
    -180,
    180,
    "Longitude harus antara -180 dan 180.",
  ),
  radiusMeter: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v),
    z
      .number({ error: "Radius wajib diisi." })
      .int("Radius harus bilangan bulat.")
      .min(RADIUS_MIN, `Radius minimal ${RADIUS_MIN} meter.`)
      .max(RADIUS_MAKS, `Radius maksimal ${RADIUS_MAKS} meter.`),
  ),
  // Checkbox tidak terkirim saat tidak dicentang, jadi absen berarti false.
  aktif: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type DataCabang = z.infer<typeof cabangSkema>;

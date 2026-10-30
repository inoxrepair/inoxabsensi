import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";

/**
 * Pengajuan izin/sakit. Status Absensi TIDAK ditambah: baris Absensi yang
 * dibuat dari pengajuan yang disetujui selalu berstatus "izin", supaya
 * Rekap, simbol, dan persen kehadiran tidak pecah. Pembeda izin vs sakit
 * hidup di pengajuan ini dan di catatan baris Absensi ("Izin: ..." /
 * "Sakit: ...").
 */

export const JENIS_IZIN = ["izin", "sakit"] as const;
export type JenisIzin = (typeof JENIS_IZIN)[number];

export const LABEL_JENIS_IZIN: Record<JenisIzin, string> = {
  izin: "Izin",
  sakit: "Sakit",
};

export const STATUS_PENGAJUAN_IZIN = [
  "pending",
  "disetujui",
  "ditolak",
  "dibatalkan",
] as const;
export type StatusPengajuanIzin = (typeof STATUS_PENGAJUAN_IZIN)[number];

export const LABEL_STATUS_PENGAJUAN_IZIN: Record<StatusPengajuanIzin, string> = {
  pending: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};

function pembacaIzin<T extends string>(daftar: readonly T[], fallback: T) {
  const set = new Set<string>(daftar);
  return (nilai: string): T => (set.has(nilai) ? (nilai as T) : fallback);
}

export const bacaJenisIzin = pembacaIzin(JENIS_IZIN, "izin");
export const bacaStatusPengajuanIzin = pembacaIzin(
  STATUS_PENGAJUAN_IZIN,
  "pending",
);

/** Batas wajar satu pengajuan; pengajuan lebih panjang dibuat bertahap. */
export const MAKS_HARI_PENGAJUAN = 30;

const SEHARI_MS_IZIN = 86_400_000;

function keUtcIzin(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Daftar tanggal "yyyy-mm-dd" inklusif dari..sampai. */
export function daftarTanggalIzin(dari: string, sampai: string): string[] {
  if (!tanggalValid(dari) || !tanggalValid(sampai) || dari > sampai) return [];
  const jumlah = Math.round(
    (keUtcIzin(sampai) - keUtcIzin(dari)) / SEHARI_MS_IZIN,
  );
  return Array.from({ length: jumlah + 1 }, (_, i) =>
    new Date(keUtcIzin(dari) + i * SEHARI_MS_IZIN).toISOString().slice(0, 10),
  );
}

/** Catatan baris Absensi yang dibuat dari pengajuan yang disetujui. */
export function catatanIzin(jenis: JenisIzin, alasan: string): string {
  return `${LABEL_JENIS_IZIN[jenis]}: ${alasan.trim()}`;
}

export const ajukanIzinSkema = z
  .object({
    dari: z.string().refine(tanggalValid, "Tanggal mulai tidak valid."),
    sampai: z.string().refine(tanggalValid, "Tanggal selesai tidak valid."),
    jenis: z.enum(JENIS_IZIN),
    alasan: z
      .string()
      .trim()
      .min(3, "Alasan wajib diisi.")
      .max(500, "Alasan maksimal 500 karakter."),
    // Keterangan bukti sebagai TEKS saja (mis. "surat dokter dikirim via
    // WA"). Tahap ini tidak ada upload file.
    buktiKeterangan: z
      .string()
      .trim()
      .max(200, "Keterangan bukti maksimal 200 karakter.")
      .optional()
      .transform((v) => v || null),
  })
  .superRefine((data, ctx) => {
    if (data.sampai < data.dari) {
      ctx.addIssue({
        code: "custom",
        path: ["sampai"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      });
      return;
    }
    if (daftarTanggalIzin(data.dari, data.sampai).length > MAKS_HARI_PENGAJUAN) {
      ctx.addIssue({
        code: "custom",
        path: ["sampai"],
        message: `Satu pengajuan maksimal ${MAKS_HARI_PENGAJUAN} hari.`,
      });
    }
  });

export type DataAjukanIzin = z.output<typeof ajukanIzinSkema>;

export const prosesIzinSkema = z.object({
  id: z.string().min(1, "Pengajuan tidak valid."),
  status: z.enum(["disetujui", "ditolak"]),
  catatanAdmin: z
    .string()
    .trim()
    .max(300, "Catatan admin maksimal 300 karakter.")
    .optional()
    .transform((v) => v || null),
});

export type DataProsesIzin = z.output<typeof prosesIzinSkema>;

/** Form admin membuat izin langsung untuk satu tanggal. */
export const buatIzinAdminSkema = z.object({
  userId: z.string().min(1, "Karyawan tidak valid."),
  tanggal: z.string().refine(tanggalValid, "Tanggal tidak valid."),
  jenis: z.enum(JENIS_IZIN),
  alasan: z
    .string()
    .trim()
    .min(3, "Alasan wajib diisi.")
    .max(500, "Alasan maksimal 500 karakter."),
});

export type DataBuatIzinAdmin = z.output<typeof buatIzinAdminSkema>;

/** Hanya pengajuan pending yang boleh diproses atau dibatalkan. */
export function bisaDiprosesIzin(status: string): boolean {
  return status === "pending";
}

export type JadwalIzinHari = {
  tanggal: string;
  /** null berarti tidak ada shift (off/libur) pada tanggal itu. */
  shiftId: string | null;
  modeShift: string | null;
  maksimalCycle: number | null;
};

export type AbsensiIzinHari = {
  tanggal: string;
  status: string;
};

export type RencanaIzin = {
  /** Tanggal yang akan dibuat baris izin baru. */
  dibuat: string[];
  /** Tanggal yang barisnya sudah ada (alpa/izin/libur) dan akan diubah jadi izin. */
  diubah: string[];
  /** Tanggal tanpa jadwal shift: dilewati, off tidak diubah jadi izin. */
  dilewatiOff: string[];
  /** Tanggal yang sudah hadir/telat: bentrok, tidak boleh ditimpa. */
  bentrok: string[];
};

/**
 * Satu-satunya sumber keputusan persetujuan izin, dipakai server action
 * dan diuji langsung. Aturan: bentrok hadir/telat menggagalkan seluruh
 * persetujuan (tidak ada penulisan sebagian); hari off dilewati.
 */
export function rencanaPersetujuanIzin(
  tanggal: string[],
  jadwal: JadwalIzinHari[],
  absensi: AbsensiIzinHari[],
): RencanaIzin {
  const petaJadwal = new Map(jadwal.map((j) => [j.tanggal, j]));
  const petaAbsensi = new Map(absensi.map((a) => [a.tanggal, a.status]));
  const rencana: RencanaIzin = {
    dibuat: [],
    diubah: [],
    dilewatiOff: [],
    bentrok: [],
  };
  for (const tgl of tanggal) {
    const j = petaJadwal.get(tgl);
    if (!j || j.shiftId === null) {
      rencana.dilewatiOff.push(tgl);
      continue;
    }
    const status = petaAbsensi.get(tgl);
    if (status === "hadir" || status === "telat") {
      rencana.bentrok.push(tgl);
      continue;
    }
    if (status === undefined) {
      rencana.dibuat.push(tgl);
    } else {
      // alpa / izin / libur yang sudah ada boleh diubah jadi izin.
      rencana.diubah.push(tgl);
    }
  }
  return rencana;
}

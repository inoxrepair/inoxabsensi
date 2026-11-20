import { z } from "zod";
import { tanggalValid } from "@/lib/rekap";
import { keJam, keMenit } from "@/lib/waktu";

/**
 * Pengajuan izin/sakit/cuti/dinas/telat/pulang-cepat. Status Absensi TIDAK
 * ditambah: baris Absensi yang dibuat dari pengajuan yang disetujui selalu
 * berstatus "izin" — kecuali dinas luar yang berstatus "hadir" — supaya
 * Rekap, simbol, dan persen kehadiran tidak pecah. Pembeda jenis hidup di
 * pengajuan ini dan di catatan baris Absensi ("Izin: ..." / "Sakit: ..." /
 * "Cuti: ..." / "Dinas luar: ...").
 *
 * Izin telat dan izin pulang cepat TIDAK membuat baris Absensi: persetujuan
 * hanya menyimpan batas jam yang diizinkan (jamMasukDiizinkan /
 * jamPulangDiizinkan), yang dipakai saat check-in/check-out dan saat
 * persetujuan memperbaiki baris yang sudah tercatat (retroaktif).
 */

export const JENIS_IZIN = [
  "izin",
  "sakit",
  "telat",
  "cuti",
  "dinas",
  "pulang-cepat",
] as const;
export type JenisIzin = (typeof JENIS_IZIN)[number];

export const LABEL_JENIS_IZIN: Record<JenisIzin, string> = {
  izin: "Izin",
  sakit: "Sakit",
  telat: "Izin telat",
  cuti: "Cuti",
  dinas: "Dinas luar",
  "pulang-cepat": "Izin pulang cepat",
};

/** Jenis yang hanya berlaku satu tanggal (dari harus sama dengan sampai). */
export const JENIS_IZIN_SEHARI = ["telat", "pulang-cepat"] as const;

/**
 * Jenis yang persetujuannya TIDAK membuat baris Absensi (batas jam saja).
 * Jenis lain membuat baris Absensi saat disetujui.
 */
export const JENIS_IZIN_TANPA_BARIS = ["telat", "pulang-cepat"] as const;

export function perluBarisAbsensi(jenis: JenisIzin): boolean {
  return !(JENIS_IZIN_TANPA_BARIS as readonly string[]).includes(jenis);
}

/** Status Absensi yang dibuat dari pengajuan yang disetujui. */
export function statusBarisDisetujui(jenis: JenisIzin): "izin" | "hadir" {
  return jenis === "dinas" ? "hadir" : "izin";
}

/**
 * Jatah cuti tahunan: 12 hari per tahun kalender (UU Ketenagakerjaan).
 * Hangus di akhir tahun (tidak dibawa ke tahun berikut), cuti berbayar
 * penuh — tanpa efek payroll. Saldo dihitung dari pengajuan cuti yang
 * sudah disetujui, jadi tidak ada tabel saldo terpisah.
 */
export const JATAH_CUTI_TAHUNAN = 12;

/** Jumlah hari dalam rentang yang jatuh pada `tahun` (untuk saldo cuti). */
export function hariDalamTahun(dari: string, sampai: string, tahun: number): number {
  return daftarTanggalIzin(dari, sampai).filter((t) =>
    t.startsWith(`${tahun}-`),
  ).length;
}

/** Sisa cuti `tahun` dari daftar cuti yang sudah disetujui. */
export function sisaCuti(
  tahun: number,
  disetujui: Array<{ dari: string; sampai: string }>,
): number {
  const terpakai = disetujui.reduce(
    (n, p) => n + hariDalamTahun(p.dari, p.sampai, tahun),
    0,
  );
  return Math.max(0, JATAH_CUTI_TAHUNAN - terpakai);
}

/** Tahun kalender yang disentuh rentang (satu, dua bila melewati tahun baru). */
export function tahunRentang(dari: string, sampai: string): number[] {
  const awal = Number(dari.slice(0, 4));
  const akhir = Number(sampai.slice(0, 4));
  return awal === akhir ? [awal] : [awal, akhir];
}

/** Catatan baris Absensi saat check-in memakai izin telat. */
export function catatanIzinTelat(jamMasukDiizinkan: number): string {
  return `Izin telat s.d. ${keJam(jamMasukDiizinkan)}`;
}

/** Catatan baris Absensi saat check-out memakai izin pulang cepat. */
export function catatanPulangCepat(jamPulangDiizinkan: number): string {
  return `Izin pulang cepat mulai ${keJam(jamPulangDiizinkan)}`;
}

/** Gabung catatan lama dengan catatan baru (tanpa duplikat). */
export function tambahCatatan(
  lama: string | null | undefined,
  baru: string,
): string {
  if (!lama) return baru;
  return lama.includes(baru) ? lama : `${lama} · ${baru}`;
}

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
    // WA"). Foto bukti (bila ada) dikirim terpisah sebagai file dan
    // ditangani server action, bukan skema ini.
    buktiKeterangan: z
      .string()
      .trim()
      .max(200, "Keterangan bukti maksimal 200 karakter.")
      .optional()
      .transform((v) => v || null),
    /** Jam batas masuk yang diizinkan ("10.00"/"10:00") — jenis "telat". */
    jamMasukDiizinkan: z.string().trim().optional(),
    /** Jam batas pulang yang diizinkan — jenis "pulang-cepat". */
    jamPulangDiizinkan: z.string().trim().optional(),
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
    if (
      (JENIS_IZIN_SEHARI as readonly string[]).includes(data.jenis) &&
      data.sampai !== data.dari
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sampai"],
        message:
          "Izin telat dan izin pulang cepat hanya berlaku satu hari.",
      });
    }
    if (data.jenis === "telat") {
      if (
        !data.jamMasukDiizinkan ||
        keMenit(data.jamMasukDiizinkan) === null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["jamMasukDiizinkan"],
          message: "Jam batas masuk wajib diisi (mis. 10.00).",
        });
      }
    }
    if (data.jenis === "pulang-cepat") {
      if (
        !data.jamPulangDiizinkan ||
        keMenit(data.jamPulangDiizinkan) === null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["jamPulangDiizinkan"],
          message: "Jam batas pulang wajib diisi (mis. 15.00).",
        });
      }
    }
  })
  // Jam mentah ("10.00") -> menit sejak tengah malam (600), null bila
  // tidak ada. Server action menyimpan menit ini ke kolom jam.
  .transform((data) => ({
    ...data,
    jamMasukDiizinkan: data.jamMasukDiizinkan
      ? keMenit(data.jamMasukDiizinkan)
      : null,
    jamPulangDiizinkan: data.jamPulangDiizinkan
      ? keMenit(data.jamPulangDiizinkan)
      : null,
  }));

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
export const buatIzinAdminSkema = z
  .object({
    userId: z.string().min(1, "Karyawan tidak valid."),
    tanggal: z.string().refine(tanggalValid, "Tanggal tidak valid."),
    jenis: z.enum(JENIS_IZIN),
    alasan: z
      .string()
      .trim()
      .min(3, "Alasan wajib diisi.")
      .max(500, "Alasan maksimal 500 karakter."),
    /** Jam batas masuk yang diizinkan — jenis "telat". */
    jamMasukDiizinkan: z.string().trim().optional(),
    /** Jam batas pulang yang diizinkan — jenis "pulang-cepat". */
    jamPulangDiizinkan: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.jenis === "telat") {
      if (
        !data.jamMasukDiizinkan ||
        keMenit(data.jamMasukDiizinkan) === null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["jamMasukDiizinkan"],
          message: "Jam batas masuk wajib diisi (mis. 10.00).",
        });
      }
    }
    if (data.jenis === "pulang-cepat") {
      if (
        !data.jamPulangDiizinkan ||
        keMenit(data.jamPulangDiizinkan) === null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["jamPulangDiizinkan"],
          message: "Jam batas pulang wajib diisi (mis. 15.00).",
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    jamMasukDiizinkan: data.jamMasukDiizinkan
      ? keMenit(data.jamMasukDiizinkan)
      : null,
    jamPulangDiizinkan: data.jamPulangDiizinkan
      ? keMenit(data.jamPulangDiizinkan)
      : null,
  }));

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

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import {
  takeHomePay,
  type BarisPayroll,
  type KomponenGaji,
} from "@/lib/payroll";
import { tanggalLokal } from "@/lib/waktu";

/**
 * Snapshot slip gaji (menu Slip Gaji, super_admin). Angka disalin dari
 * hitungPayroll saat slip dibuat, supaya riwayat tidak berubah bila data
 * absensi/gaji nanti diedit. Model SlipGaji ada di kedua schema Prisma,
 * tetapi diakses lewat raw SQL seperti InsentifTransaksi
 * (prisma generate gagal di VM ini).
 */

/** Status slip yang tampil: "belum" = belum ada snapshot periode ini. */
export const STATUS_SLIP = ["belum", "dibuat", "dibayar"] as const;
export type StatusSlip = (typeof STATUS_SLIP)[number];

export const LABEL_STATUS_SLIP: Record<StatusSlip, string> = {
  belum: "Belum dibuat",
  dibuat: "Sudah dibuat",
  dibayar: "Sudah dibayar",
};

/** Status yang tersimpan di tabel SlipGaji ("belum" tidak pernah tersimpan). */
export type StatusSlipTersimpan = "dibuat" | "dibayar";

export function bacaStatusSlip(nilai: string): StatusSlipTersimpan {
  return nilai === "dibayar" ? "dibayar" : "dibuat";
}

/** Status tampil dari snapshot (null = belum ada snapshot). */
export function statusSlip(
  snapshot: { dibayarPada: Date | string | null } | null,
): StatusSlip {
  if (!snapshot) return "belum";
  return snapshot.dibayarPada ? "dibayar" : "dibuat";
}

export type SlipGaji = {
  id: string;
  userId: string;
  nama: string;
  periode: string;
  gajiPokok: number;
  gajiPokokFleksibel: number;
  gajiPokokHarian: number;
  tunjangan: number;
  tunjanganMakan: number;
  lembur: number;
  insentif: number;
  potonganTelat: number;
  kasbon: number;
  /** Penyesuaian gaji periode ini (bertanda: + tambahan, − pengurangan). */
  penyesuaian: number;
  /** Keterangan penyesuaian (null bila tidak ada penyesuaian). */
  keteranganPenyesuaian: string | null;
  diterima: number;
  status: StatusSlipTersimpan;
  dibuatOleh: string | null;
  dibuatPada: Date;
  dibayarOleh: string | null;
  dibayarPada: Date | null;
  /** Nama cabang saat ini (dari JOIN User); null bila user sudah dihapus. */
  cabangNama: string | null;
};

/** $queryRaw bisa mengembalikan DateTime sebagai Date atau string. */
function sebagaiDate(nilai: Date | string): Date {
  return nilai instanceof Date ? nilai : new Date(nilai);
}

/** DateTime -> dd/mm/yyyy pada zona waktu operasional (WITA). */
export function tanggalSlip(saat: Date | string): string {
  return formatTanggal(tanggalLokal(sebagaiDate(saat)));
}

/** Field status/tanggal/riwayat untuk PDF slip dari snapshot. */
export type InfoSlipPdf = {
  status: "belum" | "dibuat" | "dibayar";
  /** Tanggal dibuat, sudah dd/mm/yyyy — null bila belum dibuat. */
  dibuatPada: string | null;
  /** Tanggal dibayar, sudah dd/mm/yyyy — null bila belum dibayar. */
  dibayarPada: string | null;
  /** Nama pembuat / pembayar — null bila tak diketahui. */
  dibuatOleh: string | null;
  dibayarOleh: string | null;
};

/**
 * Petakan snapshot slip menjadi field PDF. Tanpa snapshot: status "belum"
 * dan semua tanggal null — PDF menampilkan "Belum dibuat" dan
 * "Belum dibayar", bukan tanggal cetak yang menyesatkan.
 */
export function infoSlipPdf(
  snap: SlipGaji | null,
  nama: Map<string, string>,
): InfoSlipPdf {
  if (!snap) {
    return {
      status: "belum",
      dibuatPada: null,
      dibayarPada: null,
      dibuatOleh: null,
      dibayarOleh: null,
    };
  }
  return {
    status: snap.status,
    dibuatPada: tanggalSlip(snap.dibuatPada),
    dibayarPada: snap.dibayarPada ? tanggalSlip(snap.dibayarPada) : null,
    dibuatOleh: snap.dibuatOleh
      ? (nama.get(snap.dibuatOleh) ?? snap.dibuatOleh)
      : null,
    dibayarOleh: snap.dibayarOleh
      ? (nama.get(snap.dibayarOleh) ?? snap.dibayarOleh)
      : null,
  };
}

/** Salin komponen gaji satu baris payroll menjadi snapshot slip. */
export function snapshotDariBaris(
  baris: BarisPayroll,
  periode: string,
  dibuatOleh: string,
): Omit<
  SlipGaji,
  "id" | "dibuatPada" | "dibayarOleh" | "dibayarPada" | "cabangNama"
> {
  return {
    userId: baris.userId,
    nama: baris.nama,
    periode,
    gajiPokok: baris.gajiPokok,
    gajiPokokFleksibel: baris.gajiPokokFleksibel,
    gajiPokokHarian: baris.gajiPokokHarian,
    tunjangan: baris.tunjangan,
    tunjanganMakan: baris.tunjanganMakan,
    lembur: baris.lembur,
    insentif: baris.insentif,
    potonganTelat: baris.potonganTelat,
    kasbon: baris.kasbon,
    penyesuaian: baris.penyesuaian,
    keteranganPenyesuaian: baris.keteranganPenyesuaian,
    // THP yang sama dengan yang tampil di halaman Payroll dan di PDF
    // (hitungPayroll yang sama) — dibekukan di sini.
    diterima: takeHomePay(baris),
    status: "dibuat",
    dibuatOleh,
  };
}

/** Komponen gaji dari snapshot yang tersimpan (untuk dialog Lihat). */
export function komponenDariSnapshot(s: SlipGaji): KomponenGaji {
  return {
    gajiPokok: s.gajiPokok,
    gajiPokokFleksibel: s.gajiPokokFleksibel,
    gajiPokokHarian: s.gajiPokokHarian,
    tunjangan: s.tunjangan,
    tunjanganMakan: s.tunjanganMakan,
    lembur: s.lembur,
    potonganTelat: s.potonganTelat,
    kasbon: s.kasbon,
    penyesuaian: s.penyesuaian,
    insentif: s.insentif,
  };
}

/**
 * Tunjangan makan bersifat dinamis: yang tampil selalu mengikuti pengaturan
 * "Dapat tunjangan makan" saat ini, bukan nilai saat slip dibuat. Salinan
 * snapshot dengan tunjanganMakan diganti nilai live dan THP disesuaikan
 * selisihnya; komponen lain tetap beku apa adanya.
 */
export function terapkanTunjanganMakanDinamis(
  s: SlipGaji,
  tunjanganMakanLive: number,
): SlipGaji {
  return {
    ...s,
    tunjanganMakan: tunjanganMakanLive,
    diterima: s.diterima - s.tunjanganMakan + tunjanganMakanLive,
  };
}

/** Satu baris Daftar Slip: baris payroll + snapshot bila sudah dibuat. */
export type BarisSlip = {
  userId: string;
  nama: string;
  cabang: string;
  status: StatusSlip;
  /** Angka yang tampil: snapshot bila ada, kalau tidak hitungan saat ini. */
  komponen: KomponenGaji;
  diterima: number;
  /** true = angka dari snapshot yang tersimpan. */
  dariSnapshot: boolean;
  snapshot: SlipGaji | null;
  /** Keterangan penyesuaian (dari snapshot bila ada, kalau tidak dari hitungan saat ini). */
  keteranganPenyesuaian: string | null;
};

/**
 * Gabungkan baris payroll periode ini dengan snapshot yang sudah ada.
 * Murni — dipakai halaman Daftar dan diuji unit.
 */
export function gabungkanBarisSlip(
  baris: BarisPayroll[],
  snapshots: Map<string, SlipGaji>,
): BarisSlip[] {
  return baris.map((b) => {
    const s = snapshots.get(b.userId) ?? null;
    // Tunjangan makan dinamis: slip yang sudah dibuat pun mengikuti
    // pengaturan saat ini; komponen lain tetap dari snapshot.
    const snap = s ? terapkanTunjanganMakanDinamis(s, b.tunjanganMakan) : null;
    const komponen: KomponenGaji = snap
      ? komponenDariSnapshot(snap)
      : {
          gajiPokok: b.gajiPokok,
          gajiPokokFleksibel: b.gajiPokokFleksibel,
          gajiPokokHarian: b.gajiPokokHarian,
          tunjangan: b.tunjangan,
          tunjanganMakan: b.tunjanganMakan,
          lembur: b.lembur,
          potonganTelat: b.potonganTelat,
          kasbon: b.kasbon,
          penyesuaian: b.penyesuaian,
          insentif: b.insentif,
        };
    return {
      userId: b.userId,
      nama: b.nama,
      cabang: b.cabang,
      status: statusSlip(snap),
      komponen,
      diterima: snap ? snap.diterima : takeHomePay(b),
      dariSnapshot: snap !== null,
      snapshot: snap,
      keteranganPenyesuaian: snap
        ? snap.keteranganPenyesuaian
        : b.keteranganPenyesuaian,
    };
  });
}

type BarisSlipGaji = {
  id: string;
  userId: string;
  nama: string;
  periode: string;
  gajiPokok: number;
  gajiPokokFleksibel: number;
  gajiPokokHarian: number;
  tunjangan: number;
  tunjanganMakan: number;
  lembur: number;
  insentif: number;
  potonganTelat: number;
  kasbon: number;
  penyesuaian: number;
  keteranganPenyesuaian: string | null;
  diterima: number;
  status: string;
  dibuatOleh: string | null;
  dibuatPada: Date | string;
  dibayarOleh: string | null;
  dibayarPada: Date | string | null;
  cabangNama: string | null;
};

function petakanSlip(r: BarisSlipGaji): SlipGaji {
  return {
    id: r.id,
    userId: r.userId,
    nama: r.nama,
    periode: r.periode,
    gajiPokok: Number(r.gajiPokok),
    gajiPokokFleksibel: Number(r.gajiPokokFleksibel),
    gajiPokokHarian: Number(r.gajiPokokHarian),
    tunjangan: Number(r.tunjangan),
    tunjanganMakan: Number(r.tunjanganMakan),
    lembur: Number(r.lembur),
    insentif: Number(r.insentif),
    potonganTelat: Number(r.potonganTelat),
    kasbon: Number(r.kasbon),
    penyesuaian: Number(r.penyesuaian),
    keteranganPenyesuaian: r.keteranganPenyesuaian,
    diterima: Number(r.diterima),
    status: bacaStatusSlip(r.status),
    dibuatOleh: r.dibuatOleh,
    dibuatPada: sebagaiDate(r.dibuatPada),
    dibayarOleh: r.dibayarOleh,
    dibayarPada: r.dibayarPada ? sebagaiDate(r.dibayarPada) : null,
    cabangNama: r.cabangNama,
  };
}

/** Snapshot slip satu periode, dipetakan per userId (untuk Daftar). */
export async function ambilSlipPeriode(
  periode: string,
  cabangId?: string,
): Promise<Map<string, SlipGaji>> {
  const rows = await db.$queryRaw<BarisSlipGaji[]>`
    SELECT s."id", s."userId", s."nama", s."periode", s."gajiPokok",
      s."gajiPokokFleksibel", s."gajiPokokHarian", s."tunjangan",
      s."tunjanganMakan", s."lembur", s."insentif", s."potonganTelat",
      s."kasbon", s."penyesuaian", s."keteranganPenyesuaian", s."diterima", s."status", s."dibuatOleh", s."dibuatPada",
      s."dibayarOleh", s."dibayarPada", c."nama" AS "cabangNama"
    FROM "SlipGaji" s
    LEFT JOIN "User" u ON u."id" = s."userId"
    LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
    WHERE s."periode" = ${periode}
      AND (${cabangId === undefined} OR u."cabangId" = ${cabangId ?? ""})
    ORDER BY s."nama" ASC
  `;
  return new Map(rows.map((r) => [r.userId, petakanSlip(r)]));
}

/** Satu snapshot slip berdasarkan id-nya (untuk kirim email). */
export async function ambilSlip(id: string): Promise<SlipGaji | null> {
  const rows = await db.$queryRaw<BarisSlipGaji[]>`
    SELECT s."id", s."userId", s."nama", s."periode", s."gajiPokok",
      s."gajiPokokFleksibel", s."gajiPokokHarian", s."tunjangan",
      s."tunjanganMakan", s."lembur", s."insentif", s."potonganTelat",
      s."kasbon", s."penyesuaian", s."keteranganPenyesuaian", s."diterima", s."status", s."dibuatOleh", s."dibuatPada",
      s."dibayarOleh", s."dibayarPada", c."nama" AS "cabangNama"
    FROM "SlipGaji" s
    LEFT JOIN "User" u ON u."id" = s."userId"
    LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
    WHERE s."id" = ${id}
  `;
  const row = rows[0];
  return row ? petakanSlip(row) : null;
}

/** Riwayat slip yang sudah diterbitkan, dengan filter. */
export async function ambilRiwayatSlip({
  periode,
  cabangId,
  status,
  cari,
}: {
  periode: string;
  cabangId?: string;
  status?: StatusSlipTersimpan;
  cari?: string;
}): Promise<SlipGaji[]> {
  const rows = await db.$queryRaw<BarisSlipGaji[]>`
    SELECT s."id", s."userId", s."nama", s."periode", s."gajiPokok",
      s."gajiPokokFleksibel", s."gajiPokokHarian", s."tunjangan",
      s."tunjanganMakan", s."lembur", s."insentif", s."potonganTelat",
      s."kasbon", s."penyesuaian", s."keteranganPenyesuaian", s."diterima", s."status", s."dibuatOleh", s."dibuatPada",
      s."dibayarOleh", s."dibayarPada", c."nama" AS "cabangNama"
    FROM "SlipGaji" s
    LEFT JOIN "User" u ON u."id" = s."userId"
    LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
    WHERE s."periode" = ${periode}
      AND (${cabangId === undefined} OR u."cabangId" = ${cabangId ?? ""})
      AND (${status === undefined} OR s."status" = ${status ?? ""})
      AND (${cari === undefined} OR LOWER(s."nama") LIKE ${"%" + (cari ?? "").toLowerCase() + "%"})
    ORDER BY s."dibuatPada" DESC, s."nama" ASC
  `;
  return rows.map(petakanSlip);
}

/** true bila snapshot slip karyawan ini sudah ada pada periode itu. */
export async function slipAda(
  userId: string,
  periode: string,
): Promise<boolean> {
  const rows = await db.$queryRaw<{ jumlah: bigint }[]>`
    SELECT COUNT(*) AS "jumlah" FROM "SlipGaji"
    WHERE "userId" = ${userId} AND "periode" = ${periode}
  `;
  return Number(rows[0]?.jumlah ?? 0) > 0;
}

/**
 * Simpan snapshot slip; bila sudah ada (userId + periode) biarkan dan
 * kembalikan false — pemanggil yang memberi pesan "sudah dibuat".
 */
export async function simpanSlip(
  snapshot: Omit<
    SlipGaji,
    "id" | "dibuatPada" | "dibayarOleh" | "dibayarPada" | "cabangNama"
  >,
): Promise<boolean> {
  const hasil = await db.$executeRaw`
    INSERT INTO "SlipGaji" ("id", "userId", "nama", "periode", "gajiPokok",
      "gajiPokokFleksibel", "gajiPokokHarian", "tunjangan", "tunjanganMakan",
      "lembur", "insentif", "potonganTelat", "kasbon", "penyesuaian",
      "keteranganPenyesuaian", "diterima", "status", "dibuatOleh")
    VALUES (${randomUUID()}, ${snapshot.userId}, ${snapshot.nama},
      ${snapshot.periode}, ${snapshot.gajiPokok},
      ${snapshot.gajiPokokFleksibel}, ${snapshot.gajiPokokHarian},
      ${snapshot.tunjangan}, ${snapshot.tunjanganMakan}, ${snapshot.lembur},
      ${snapshot.insentif}, ${snapshot.potonganTelat}, ${snapshot.kasbon},
      ${snapshot.penyesuaian}, ${snapshot.keteranganPenyesuaian},
      ${snapshot.diterima}, ${snapshot.status}, ${snapshot.dibuatOleh})
    ON CONFLICT ("userId", "periode") DO NOTHING
  `;
  return hasil > 0;
}

/**
 * Tandai slip sudah dibayar. Hanya dari status "dibuat" — slip yang sudah
 * dibayar tidak berubah lagi. INI transisi yang nantinya memicu kirim
 * email slip otomatis (belum dibangun); jangan tambah efek lain di sini
 * tanpa memisahkan pemicunya.
 */
export async function tandaiSlipDibayar(
  id: string,
  adminId: string,
): Promise<boolean> {
  const hasil = await db.$executeRaw`
    UPDATE "SlipGaji"
    SET "status" = 'dibayar', "dibayarPada" = CURRENT_TIMESTAMP,
      "dibayarOleh" = ${adminId}
    WHERE "id" = ${id} AND "status" = 'dibuat'
  `;
  return hasil > 0;
}

/** Nama tampilan untuk sekumpulan ID user (dibuatOleh/dibayarOleh). */
export async function petaNamaUser(
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const bersih = [
    ...new Set(ids.filter((id): id is string => Boolean(id))),
  ];
  if (bersih.length === 0) return new Map();
  const users = await db.user.findMany({
    where: { id: { in: bersih } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

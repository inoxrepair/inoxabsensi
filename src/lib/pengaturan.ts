import { db } from "@/lib/db";
import {
  PRESET_SMTP,
  presetValid,
  type PresetSmtp,
} from "@/lib/email-smtp-preset";

export const KUNCI_LOGO_APLIKASI = "logo_aplikasi";
export const KUNCI_NAMA_PERUSAHAAN = "nama_perusahaan";

/** Setelan email slip gaji (diatur di Pengaturan, super_admin saja). */
export const KUNCI_EMAIL_SLIP_AKTIF = "email_slip_aktif";
export const KUNCI_EMAIL_SMTP_PRESET = "email_smtp_preset";
export const KUNCI_EMAIL_SMTP_HOST = "email_smtp_host";
export const KUNCI_EMAIL_SMTP_PORT = "email_smtp_port";
export const KUNCI_EMAIL_PENGIRIM = "email_pengirim";
export const KUNCI_EMAIL_SANDI = "email_sandi";
/**
 * Login SMTP (username auth), dipisah dari alamat pengirim (From).
 * Opsional: kosong = login memakai alamat pengirim (Gmail/Outlook).
 * Diisi untuk Brevo, yang login-nya alamat khusus xxx@smtp-brevo.com.
 */
export const KUNCI_EMAIL_SMTP_LOGIN = "email_smtp_login";
/**
 * Alamat tujuan email tes (opsional). Kosong = tes dikirim ke alamat
 * pengirim. Diisi bila super admin mau tes sampai ke inbox lain
 * (mis. email pribadinya) tanpa mengubah alamat pengirim.
 */
export const KUNCI_EMAIL_TES_KE = "email_tes_ke";
/** Nama perusahaan bila belum pernah diatur (sesuai logo iNOX). */
export const NAMA_PERUSAHAAN_BAWAAN = "iNOX Repair";

/**
 * Logo kustom (data URL) bila sudah diunggah lewat Pengaturan, null bila belum.
 *
 * Sengaja lewat SQL mentah, bukan delegate Prisma: delegate baru tersedia
 * setelah `prisma generate` dijalankan ulang, sedangkan generate di VM ini
 * gagal mengunduh engine (jaringan proxy). Tabelnya tetap didefinisikan di
 * schema Prisma + migrasi Postgres, jadi delegate bisa dipakai nanti setelah
 * generate berhasil (mis. saat build di VPS). SQL di sini kompatibel dengan
 * Postgres (produksi) maupun SQLite (dev lokal).
 */
export async function bacaLogoAplikasi(): Promise<string | null> {
  try {
    const rows = await db.$queryRaw<{ nilai: string }[]>`
      SELECT "nilai" FROM "Pengaturan" WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
    `;
    return rows[0]?.nilai ?? null;
  } catch {
    // Tabel belum ada (migrasi belum jalan): anggap belum ada logo kustom.
    return null;
  }
}

/**
 * Nama perusahaan untuk slip gaji (diatur di Pengaturan). Bila belum pernah
 * diatur atau kosong, kembali ke nama bawaan "iNOX Repair".
 */
export async function bacaNamaPerusahaan(): Promise<string> {
  try {
    const rows = await db.$queryRaw<{ nilai: string }[]>`
      SELECT "nilai" FROM "Pengaturan" WHERE "kunci" = ${KUNCI_NAMA_PERUSAHAAN}
    `;
    const nilai = rows[0]?.nilai?.trim();
    return nilai ? nilai : NAMA_PERUSAHAAN_BAWAAN;
  } catch {
    // Tabel belum ada (migrasi belum jalan): pakai nama bawaan.
    return NAMA_PERUSAHAAN_BAWAAN;
  }
}

/**
 * Versi logo kustom (waktu terakhir diubah, dalam milidetik) atau null bila
 * belum ada logo kustom. Dipakai sebagai query `?v=` di src gambar logo,
 * supaya setelah logo diganti di Pengaturan, header yang tidak di-remount
 * saat navigasi client-side tetap memuat gambar baru (src berubah, bukan
 * src yang sama yang dipertahankan browser).
 */
export async function bacaVersiLogo(): Promise<string | null> {
  try {
    const rows = await db.$queryRaw<{ updatedAt: Date }[]>`
      SELECT "updatedAt" FROM "Pengaturan" WHERE "kunci" = ${KUNCI_LOGO_APLIKASI}
    `;
    const waktu = rows[0]?.updatedAt;
    return waktu ? String(new Date(waktu).getTime()) : null;
  } catch {
    return null;
  }
}

/**
 * Setelan email slip gaji lengkap, termasuk sandi — hanya dipakai kode
 * server (transport + aksi tes). JANGAN teruskan objek ini ke komponen
 * client; halaman Pengaturan memetakannya ke SetelanEmailSlipTampil.
 */
export type SetelanEmailSlip = {
  aktif: boolean;
  preset: PresetSmtp;
  host: string;
  port: number;
  pengirim: string;
  sandi: string;
  /** Login SMTP (auth). Kosong = login memakai alamat pengirim. */
  login: string;
  /** Alamat tujuan email tes. Kosong = tes dikirim ke alamat pengirim. */
  emailTesKe: string;
};

/**
 * Setelan email slip gaji yang aman tampil di form: sandi tidak pernah
 * dikirim ke client, hanya status sudah-diisi/belum. Login bukan rahasia
 * (hanya username), jadi boleh tampil di form.
 */
export type SetelanEmailSlipTampil = {
  aktif: boolean;
  preset: PresetSmtp;
  host: string;
  port: string;
  pengirim: string;
  sandiAda: boolean;
  login: string;
  emailTesKe: string;
};

/** Bawaan bila belum pernah diatur: fitur NONAKTIF, preset Gmail. */
export const SETELAN_EMAIL_SLIP_BAWAAN: SetelanEmailSlip = {
  aktif: false,
  preset: "gmail",
  host: PRESET_SMTP.gmail.host,
  port: PRESET_SMTP.gmail.port,
  pengirim: "",
  sandi: "",
  login: "",
  emailTesKe: "",
};

/**
 * Baca setelan email slip gaji dari tabel Pengaturan (satu query untuk
 * semua kunci; tabel ini kecil). Nilai hilang/tidak valid kembali ke
 * bawaan; port di luar 1–65535 kembali ke 587.
 */
export async function bacaSetelanEmailSlip(): Promise<SetelanEmailSlip> {
  try {
    const rows = await db.$queryRaw<{ kunci: string; nilai: string }[]>`
      SELECT "kunci", "nilai" FROM "Pengaturan"
    `;
    const peta = new Map(rows.map((r) => [r.kunci, r.nilai]));
    const presetMentah = peta.get(KUNCI_EMAIL_SMTP_PRESET) ?? "";
    const preset: PresetSmtp = presetValid(presetMentah)
      ? presetMentah
      : "gmail";
    const portMentah = Number.parseInt(
      peta.get(KUNCI_EMAIL_SMTP_PORT) ?? "",
      10,
    );
    const port =
      Number.isInteger(portMentah) && portMentah >= 1 && portMentah <= 65535
        ? portMentah
        : 587;
    const host = (peta.get(KUNCI_EMAIL_SMTP_HOST) ?? "").trim();
    const hostEfektif =
      host ||
      (preset === "kustom"
        ? PRESET_SMTP.gmail.host
        : PRESET_SMTP[preset].host);
    return {
      aktif: peta.get(KUNCI_EMAIL_SLIP_AKTIF) === "1",
      preset,
      host: hostEfektif,
      port: peta.has(KUNCI_EMAIL_SMTP_PORT) ? port : PRESET_SMTP.gmail.port,
      pengirim: (peta.get(KUNCI_EMAIL_PENGIRIM) ?? "").trim(),
      sandi: peta.get(KUNCI_EMAIL_SANDI) ?? "",
      login: (peta.get(KUNCI_EMAIL_SMTP_LOGIN) ?? "").trim(),
      emailTesKe: (peta.get(KUNCI_EMAIL_TES_KE) ?? "").trim(),
    };
  } catch {
    // Tabel belum ada (migrasi belum jalan): fitur tetap nonaktif.
    return { ...SETELAN_EMAIL_SLIP_BAWAAN };
  }
}

/** Versi tampil untuk form Pengaturan (tanpa nilai sandi). */
export function setelanEmailSlipTampil(
  setelan: SetelanEmailSlip,
): SetelanEmailSlipTampil {
  return {
    aktif: setelan.aktif,
    preset: setelan.preset,
    host: setelan.host,
    port: String(setelan.port),
    pengirim: setelan.pengirim,
    sandiAda: setelan.sandi.length > 0,
    login: setelan.login,
    emailTesKe: setelan.emailTesKe,
  };
}

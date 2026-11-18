"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { buatPengirimSmtp } from "@/lib/email-slip";
import { presetValid, type PresetSmtp } from "@/lib/email-smtp-preset";
import {
  KUNCI_EMAIL_PENGIRIM,
  KUNCI_EMAIL_SANDI,
  KUNCI_EMAIL_SLIP_AKTIF,
  KUNCI_EMAIL_SMTP_HOST,
  KUNCI_EMAIL_SMTP_PORT,
  KUNCI_EMAIL_SMTP_PRESET,
  bacaSetelanEmailSlip,
} from "@/lib/pengaturan";
import { wajibAkses } from "@/lib/session";

export type HasilEmailSlip = { ok: boolean; pesan: string } | undefined;

const JALUR_PENGATURAN = "/admin/pengaturan";
const MAKS_PANJANG = 200;

/** Guard ganda seperti ubahHakAkses: hanya super admin boleh mengubah setelan email. */
async function wajibSuperAdmin(): Promise<boolean> {
  const admin = await wajibAkses("pengaturan");
  return admin.role === "super_admin";
}

// SQL mentah (lihat lib/pengaturan.ts kenapa): update dulu, insert bila
// belum ada — cara ini jalan di Postgres maupun SQLite tanpa ON CONFLICT.
async function simpanKunci(kunci: string, nilai: string): Promise<void> {
  const diubah = await db.$executeRaw`
    UPDATE "Pengaturan" SET "nilai" = ${nilai}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "kunci" = ${kunci}
  `;
  if (diubah === 0) {
    await db.$executeRaw`
      INSERT INTO "Pengaturan" ("kunci", "nilai") VALUES (${kunci}, ${nilai})
    `;
  }
}

async function hapusKunci(kunci: string): Promise<void> {
  await db.$executeRaw`
    DELETE FROM "Pengaturan" WHERE "kunci" = ${kunci}
  `.catch(() => null);
}

function bacaPort(nilai: string): number | null {
  if (!nilai) return null;
  const port = Number.parseInt(nilai, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

function emailValid(nilai: string): boolean {
  return nilai.length > 0 && nilai.length <= MAKS_PANJANG && nilai.includes("@") && !nilai.includes(" ");
}

/**
 * Simpan setelan email slip gaji. Sandi yang dikosongkan berarti "pakai
 * sandi yang sudah tersimpan" (kunci tidak disentuh). Mengaktifkan toggle
 * wajib setelan lengkap: host, port, alamat pengirim, dan sandi (baru atau
 * yang sudah tersimpan). Nilai sandi tidak pernah ditulis ke log.
 */
export async function simpanSetelanEmail(
  formData: FormData,
): Promise<HasilEmailSlip> {
  if (!(await wajibSuperAdmin())) {
    return { ok: false, pesan: "Hanya super admin dapat mengubah setelan email." };
  }

  const aktif = String(formData.get("aktif") ?? "") === "1";
  const presetMentah = String(formData.get("preset") ?? "");
  const preset: PresetSmtp = presetValid(presetMentah) ? presetMentah : "kustom";
  const host = String(formData.get("host") ?? "").trim();
  const portMentah = String(formData.get("port") ?? "").trim();
  const port = bacaPort(portMentah);
  const pengirim = String(formData.get("pengirim") ?? "").trim();
  const sandi = String(formData.get("sandi") ?? "");

  if (host.length > MAKS_PANJANG) {
    return { ok: false, pesan: "Host SMTP terlalu panjang (maks. 200 karakter)." };
  }
  if (portMentah && port === null) {
    return { ok: false, pesan: "Port SMTP tidak valid (1–65535)." };
  }
  if (pengirim && !emailValid(pengirim)) {
    return { ok: false, pesan: "Alamat email pengirim tidak valid." };
  }
  if (sandi.length > MAKS_PANJANG) {
    return { ok: false, pesan: "Sandi terlalu panjang (maks. 200 karakter)." };
  }

  // Mengaktifkan wajib lengkap; sandi boleh mengandalkan yang tersimpan.
  const tersimpan = await bacaSetelanEmailSlip();
  const sandiEfektif = sandi || tersimpan.sandi;
  if (aktif) {
    if (!host || port === null || !pengirim || !sandiEfektif) {
      return {
        ok: false,
        pesan:
          "Lengkapi host, port, alamat email pengirim, dan sandi sebelum mengaktifkan email slip.",
      };
    }
  }

  await simpanKunci(KUNCI_EMAIL_SLIP_AKTIF, aktif ? "1" : "0");
  await simpanKunci(KUNCI_EMAIL_SMTP_PRESET, preset);
  if (host) await simpanKunci(KUNCI_EMAIL_SMTP_HOST, host);
  else await hapusKunci(KUNCI_EMAIL_SMTP_HOST);
  if (port !== null) await simpanKunci(KUNCI_EMAIL_SMTP_PORT, String(port));
  else await hapusKunci(KUNCI_EMAIL_SMTP_PORT);
  if (pengirim) await simpanKunci(KUNCI_EMAIL_PENGIRIM, pengirim);
  else await hapusKunci(KUNCI_EMAIL_PENGIRIM);
  // Sandi kosong = sandi lama tetap dipakai (kunci tidak disentuh).
  if (sandi) await simpanKunci(KUNCI_EMAIL_SANDI, sandi);

  revalidatePath(JALUR_PENGATURAN);
  return {
    ok: true,
    pesan: aktif
      ? "Setelan email slip disimpan. Email slip otomatis AKTIF."
      : "Setelan email slip disimpan. Email slip otomatis NONAKTIF.",
  };
}

/**
 * Kirim email tes ke alamat pengirim sendiri, memakai setelan yang terisi
 * di form saat ini (tidak harus disimpan dulu). Sandi yang dikosongkan
 * memakai sandi yang sudah tersimpan. Melaporkan berhasil/gagal beserta
 * alasannya; nilai sandi tidak pernah ditulis ke log.
 */
export async function kirimEmailTes(
  formData: FormData,
): Promise<HasilEmailSlip> {
  if (!(await wajibSuperAdmin())) {
    return { ok: false, pesan: "Hanya super admin dapat mengirim email tes." };
  }

  const host = String(formData.get("host") ?? "").trim();
  const port = bacaPort(String(formData.get("port") ?? "").trim());
  const pengirim = String(formData.get("pengirim") ?? "").trim();
  const sandiForm = String(formData.get("sandi") ?? "");

  if (!host || port === null || !pengirim) {
    return {
      ok: false,
      pesan: "Lengkapi host SMTP, port, dan alamat email pengirim dulu.",
    };
  }
  if (!emailValid(pengirim)) {
    return { ok: false, pesan: "Alamat email pengirim tidak valid." };
  }
  const tersimpan = await bacaSetelanEmailSlip();
  const sandi = sandiForm || tersimpan.sandi;
  if (!sandi) {
    return {
      ok: false,
      pesan: "Isi sandi / App Password pengirim dulu.",
    };
  }

  const pengirimEmail = buatPengirimSmtp({ host, port, pengirim, sandi });
  if (!pengirimEmail) {
    return { ok: false, pesan: "Setelan SMTP tidak valid." };
  }
  try {
    await pengirimEmail({
      ke: pengirim,
      subjek: "Tes Email Slip Gaji — iNOX Absensi",
      teks: [
        "Ini email tes dari menu Pengaturan → Email Slip Gaji.",
        "",
        "Bila email ini sampai, setelan SMTP sudah benar dan slip gaji",
        "akan terkirim ke karyawan saat ditandai dibayar (bila fiturnya aktif).",
      ].join("\n"),
    });
    return {
      ok: true,
      pesan: `Email tes terkirim ke ${pengirim}. Periksa inbox (dan folder spam).`,
    };
  } catch (galat) {
    const pesan =
      galat instanceof Error ? galat.message : "kesalahan tidak diketahui";
    return {
      ok: false,
      pesan: `Gagal mengirim email tes: ${pesan.slice(0, 120)}`,
    };
  }
}

import { Buffer } from "node:buffer";
import nodemailer from "nodemailer";
import { namaAman } from "@/lib/arsip";
import { db } from "@/lib/db";
import { secureUntukPort } from "@/lib/email-smtp-preset";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { ambilLogAbsensiSlip } from "@/lib/log-absensi-slip";
import { buatSlipPayrollPdf } from "@/lib/payroll-pdf";
import { hitungPayroll } from "@/lib/payroll-data";
import {
  bacaNamaPerusahaan,
  bacaSetelanEmailSlip,
  type SetelanEmailSlip,
} from "@/lib/pengaturan";
import { rentangPeriodeGajian } from "@/lib/rekap";
import { ambilSlip } from "@/lib/slip-gaji";
import { tanggalLokal } from "@/lib/waktu";

/**
 * Kirim email slip gaji via SMTP (menu Slip Gaji, super_admin).
 * Dipicu dari tandaiDibayar — BUKAN dari pembuatan snapshot. Gagal kirim
 * tidak pernah membatalkan status Dibayar; pemanggil hanya melaporkan
 * hasilnya. Konfigurasi dari halaman Pengaturan → Email Slip Gaji
 * (tabel Pengaturan, bukan env): toggle aktif, preset penyedia
 * (Gmail/Outlook.com/Microsoft 365/Kustom), host, port, alamat pengirim,
 * dan sandi/App Password. Toggle default NONAKTIF — tidak ada email
 * yang terkirim sampai super admin mengaktifkannya.
 */

export type LampiranEmail = { namaFile: string; isi: Uint8Array };

export type PesanEmail = {
  ke: string;
  subjek: string;
  teks: string;
  /** Opsional: email tes tidak memakai lampiran. */
  lampiran?: LampiranEmail;
};

/** Fungsi kirim yang bisa diganti fake di test. */
export type PengirimEmail = (pesan: PesanEmail) => Promise<void>;

/** Isi email slip (murni, Bahasa Indonesia). THP dari snapshot slip. */
export function isiEmailSlip({
  nama,
  rentang,
  diterima,
  perusahaan,
}: {
  nama: string;
  rentang: string;
  diterima: number;
  perusahaan: string;
}): { subjek: string; teks: string } {
  return {
    subjek: `Slip Gaji ${nama} — Periode ${rentang}`,
    teks: [
      `Halo ${nama},`,
      ``,
      `Slip gaji Anda untuk periode ${rentang} sudah dibayar.`,
      `Total diterima (THP): ${formatRupiah(diterima)}.`,
      ``,
      `PDF slip gaji terlampir pada email ini.`,
      ``,
      perusahaan,
    ].join("\n"),
  };
}

export type SetelanTransportSmtp = {
  host: string;
  port: number;
  pengirim: string;
  sandi: string;
};

/**
 * Opsi nodemailer dari setelan SMTP (murni, bisa dites tanpa kirim).
 * null bila ada field yang kosong/tidak valid. Port 465 = TLS langsung
 * (secure true); port lain (587 STARTTLS, 25) = secure false.
 */
export function opsiTransportSmtp(
  setelan: SetelanTransportSmtp,
): {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
} | null {
  const host = setelan.host.trim();
  const pengirim = setelan.pengirim.trim();
  const sandi = setelan.sandi;
  if (
    !host ||
    !pengirim ||
    !sandi ||
    !Number.isInteger(setelan.port) ||
    setelan.port < 1 ||
    setelan.port > 65535
  ) {
    return null;
  }
  return {
    host,
    port: setelan.port,
    secure: secureUntukPort(setelan.port),
    auth: { user: pengirim, pass: sandi },
  };
}

/**
 * Pengirim SMTP generik dari setelan (host/port/pengirim/sandi). null bila
 * setelan belum lengkap — pemanggil yang memutuskan pesannya.
 */
export function buatPengirimSmtp(
  setelan: SetelanTransportSmtp,
): PengirimEmail | null {
  const opsi = opsiTransportSmtp(setelan);
  if (!opsi) return null;
  const transporter = nodemailer.createTransport(opsi);
  return async (pesan) => {
    await transporter.sendMail({
      from: opsi.auth.user,
      to: pesan.ke,
      subject: pesan.subjek,
      text: pesan.teks,
      attachments: pesan.lampiran
        ? [
            {
              filename: pesan.lampiran.namaFile,
              content: Buffer.from(pesan.lampiran.isi),
            },
          ]
        : undefined,
    });
  };
}

/**
 * Pengirim dari setelan yang tersimpan di Pengaturan (dibaca saat
 * dipanggil, bukan saat import). null bila toggle nonaktif atau setelan
 * belum lengkap.
 */
export async function buatPengirimEmailSlip(): Promise<PengirimEmail | null> {
  const setelan = await bacaSetelanEmailSlip();
  if (!setelan.aktif) return null;
  return buatPengirimSmtp(setelan);
}

/**
 * PDF slip yang sama seperti tombol "Slip PDF" (angka live hitungPayroll,
 * bukan snapshot) — langkah yang sama dengan route ekspor payroll.
 */
export async function bangunPdfSlip(
  userId: string,
  periode: string,
): Promise<LampiranEmail | null> {
  const bulanIni = tanggalLokal().slice(0, 7);
  const { baris, jendela, rentang } = await hitungPayroll({
    periode,
    cabangId: "",
    bulanIni,
  });
  const r = baris.find((b) => b.userId === userId);
  if (!r) return null;
  const [perusahaan, log] = await Promise.all([
    bacaNamaPerusahaan(),
    ambilLogAbsensiSlip(userId, jendela.dari, jendela.sampai),
  ]);
  const pdf = await buatSlipPayrollPdf({
    periode,
    rentang,
    jendelaKustom: jendela.kustom,
    jendela,
    perusahaan,
    baris: r,
    log,
  });
  return {
    namaFile: `slip-gaji-${namaAman(r.nama)}-${periode}.pdf`,
    isi: pdf,
  };
}

export type HasilKirimEmail = {
  terkirim: boolean;
  alasan: string;
  /** True bila toggle email slip nonaktif — tidak ada upaya kirim sama sekali. */
  dilewati?: boolean;
};

/**
 * Kirim slip yang baru ditandai dibayar ke email karyawan. Tanpa `opsi`,
 * setelan dibaca dari Pengaturan dan toggle diperiksa dulu: bila toggle
 * nonaktif, kembali dengan `dilewati: true` tanpa menyentuh database slip
 * maupun SMTP. `opsi.pengirim`/`opsi.setelan` hanya untuk test (fake).
 * Mengembalikan alasan gagal — jangan lempar error ke pemanggil, supaya
 * status Dibayar yang sudah tersimpan tidak ikut batal.
 */
export async function kirimEmailSlipDibayar(
  slipId: string,
  opsi: {
    pengirim?: PengirimEmail | null;
    setelan?: SetelanEmailSlip;
  } = {},
): Promise<HasilKirimEmail> {
  const setelan = opsi.setelan ?? (await bacaSetelanEmailSlip());
  if (!setelan.aktif) {
    return { terkirim: false, alasan: "", dilewati: true };
  }
  const pengirim =
    opsi.pengirim !== undefined
      ? opsi.pengirim
      : buatPengirimSmtp(setelan);
  if (!pengirim) {
    return {
      terkirim: false,
      alasan:
        "Email slip belum dikonfigurasi — lengkapi di menu Pengaturan → Email Slip Gaji.",
    };
  }
  const slip = await ambilSlip(slipId);
  if (!slip) return { terkirim: false, alasan: "Slip tidak ditemukan." };
  const karyawan = await db.user.findUnique({
    where: { id: slip.userId },
    select: { email: true },
  });
  const email = karyawan?.email?.trim() ?? "";
  if (!email) {
    return { terkirim: false, alasan: "Karyawan belum punya alamat email." };
  }
  const lampiran = await bangunPdfSlip(slip.userId, slip.periode);
  if (!lampiran) {
    return {
      terkirim: false,
      alasan: "Slip tidak ditemukan pada periode ini.",
    };
  }
  const rentang = rentangPeriodeGajian(slip.periode);
  const labelRentang = `${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}`;
  const perusahaan = await bacaNamaPerusahaan();
  const isi = isiEmailSlip({
    nama: slip.nama,
    rentang: labelRentang,
    diterima: slip.diterima,
    perusahaan,
  });
  try {
    await pengirim({ ke: email, ...isi, lampiran });
    return { terkirim: true, alasan: "" };
  } catch (galat) {
    // Pesan SMTP bisa panjang; potong supaya pesan aksi tetap terbaca.
    // Nilai sandi tidak pernah ada di pesan ini (hanya pesan galat SMTP).
    const pesan =
      galat instanceof Error ? galat.message : "kesalahan tidak diketahui";
    return {
      terkirim: false,
      alasan: `Gagal mengirim email: ${pesan.slice(0, 120)}`,
    };
  }
}

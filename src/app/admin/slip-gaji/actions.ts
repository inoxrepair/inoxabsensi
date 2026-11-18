"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { kirimEmailSlipDibayar } from "@/lib/email-slip";
import { hitungPayroll } from "@/lib/payroll-data";
import { periodeValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import {
  simpanSlip,
  slipAda,
  snapshotDariBaris,
  tandaiSlipDibayar,
} from "@/lib/slip-gaji";
import { tanggalLokal } from "@/lib/waktu";

export type HasilSlip = { ok: boolean; pesan: string };

const JALUR_DAFTAR = "/admin/slip-gaji";
const JALUR_RIWAYAT = "/admin/slip-gaji/riwayat";

function segarkan() {
  revalidatePath(JALUR_DAFTAR);
  revalidatePath(JALUR_RIWAYAT);
}

/** Buat snapshot slip satu karyawan untuk satu periode gajian. */
export async function buatSlip(formData: FormData): Promise<HasilSlip> {
  const admin = await wajibAkses("slip-gaji");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat membuat slip gaji." };
  }

  const userId = String(formData.get("userId") ?? "");
  const periode = String(formData.get("periode") ?? "");
  if (!userId || !periodeValid(periode)) {
    return { ok: false, pesan: "Karyawan atau periode tidak valid." };
  }

  // Jangan percaya userId dari form; pastikan target adalah karyawan aktif.
  const target = await db.user.findFirst({
    where: { id: userId, aktif: true, role: { not: "super_admin" } },
    select: { name: true },
  });
  if (!target) return { ok: false, pesan: "Karyawan tidak ditemukan." };
  if (await slipAda(userId, periode)) {
    return { ok: false, pesan: `Slip ${target.name} sudah dibuat.` };
  }

  // Angka dari hitungPayroll yang sama dengan halaman Payroll dan PDF —
  // satu sumber kebenaran; snapshot membekukannya per periode.
  const { baris } = await hitungPayroll({
    periode,
    cabangId: "",
    bulanIni: tanggalLokal().slice(0, 7),
  });
  const r = baris.find((b) => b.userId === userId);
  if (!r) {
    return { ok: false, pesan: "Karyawan tidak ditemukan pada periode ini." };
  }

  const tersimpan = await simpanSlip(snapshotDariBaris(r, periode, admin.id));
  if (!tersimpan) {
    return { ok: false, pesan: `Slip ${target.name} sudah dibuat.` };
  }

  segarkan();
  return { ok: true, pesan: `Slip ${target.name} dibuat.` };
}

/** Buat snapshot slip untuk semua karyawan yang belum punya slip periode ini. */
export async function buatSemuaSlip(
  formData: FormData,
): Promise<HasilSlip> {
  const admin = await wajibAkses("slip-gaji");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat membuat slip gaji." };
  }

  const periode = String(formData.get("periode") ?? "");
  if (!periodeValid(periode)) {
    return { ok: false, pesan: "Periode tidak valid." };
  }

  const { baris } = await hitungPayroll({
    periode,
    cabangId: "",
    bulanIni: tanggalLokal().slice(0, 7),
  });

  let dibuat = 0;
  let sudahAda = 0;
  for (const r of baris) {
    const tersimpan = await simpanSlip(
      snapshotDariBaris(r, periode, admin.id),
    );
    if (tersimpan) dibuat += 1;
    else sudahAda += 1;
  }

  segarkan();
  if (dibuat === 0 && sudahAda === 0) {
    return { ok: false, pesan: "Belum ada karyawan aktif pada periode ini." };
  }
  return {
    ok: true,
    pesan: `${dibuat} slip dibuat${sudahAda > 0 ? `, ${sudahAda} sudah ada sebelumnya` : ""}.`,
  };
}

/**
 * Tandai slip sudah dibayar. Satu-satunya transisi status di sini —
 * kirim email slip otomatis dikaitkan ke transisi ini, bukan ke
 * pembuatan snapshot. Gagal kirim email tidak membatalkan status Dibayar.
 */
export async function tandaiDibayar(
  formData: FormData,
): Promise<HasilSlip> {
  const admin = await wajibAkses("slip-gaji");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat menandai dibayar." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, pesan: "Slip tidak valid." };

  const berubah = await tandaiSlipDibayar(id, admin.id);
  if (!berubah) {
    return { ok: false, pesan: "Slip sudah dibayar atau tidak ditemukan." };
  }

  segarkan();

  // Email slip hanya bila toggle di Pengaturan aktif. Bila nonaktif,
  // kirimEmailSlipDibayar kembali dengan dilewati: true tanpa upaya kirim.
  const email = await kirimEmailSlipDibayar(id);
  if (email.dilewati) {
    return { ok: true, pesan: "Slip ditandai sudah dibayar." };
  }
  if (email.terkirim) {
    return {
      ok: true,
      pesan: "Slip ditandai sudah dibayar. Email slip terkirim.",
    };
  }
  return {
    ok: true,
    pesan: `Slip ditandai sudah dibayar. Email gagal terkirim: ${email.alasan}`,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import {
  hapusInformasi as hapusBaris,
  tambahInformasi,
  ubahAktifInformasi as ubahAktifBaris,
  ubahInformasi as ubahBaris,
} from "@/lib/informasi-data";
import { informasiSkema } from "@/lib/informasi";
import { wajibAkses } from "@/lib/session";

/**
 * Pesan informasi untuk popup setelah absen masuk: hanya super_admin
 * (menu "informasi") yang boleh mengelola. Satu pesan tampil ke semua
 * karyawan semua cabang selama toggle aktif dan hari ini dalam masa
 * tampil (mulai + durasi hari).
 */
export type HasilInformasi = { ok: boolean; pesan: string } | undefined;

function bacaForm(formData: FormData) {
  return informasiSkema.safeParse({
    judul: formData.get("judul"),
    isi: formData.get("isi"),
    ctaLabel: formData.get("ctaLabel") || "Mengerti",
    ctaAksi: formData.get("ctaAksi"),
    ctaTautan: formData.get("ctaTautan") || "",
    ctaHalaman: formData.get("ctaHalaman") || "",
    mulaiTanggal: formData.get("mulaiTanggal"),
    durasiHari: formData.get("durasiHari"),
    aktif: formData.get("aktif") === "on",
  });
}

/** Buat pesan baru, atau ubah bila form membawa id. */
export async function simpanInformasi(
  formData: FormData,
): Promise<HasilInformasi> {
  await wajibAkses("informasi");
  const hasil = bacaForm(formData);
  if (!hasil.success) {
    return {
      ok: false,
      pesan: hasil.error.issues[0]?.message ?? "Data pesan tidak valid.",
    };
  }
  const d = hasil.data;
  const data = {
    judul: d.judul,
    isi: d.isi,
    ctaLabel: d.ctaLabel || "Mengerti",
    ctaAksi: d.ctaAksi,
    ctaTautan: d.ctaAksi === "tautan" ? d.ctaTautan || null : null,
    ctaHalaman: d.ctaAksi === "halaman" ? d.ctaHalaman || null : null,
    mulaiTanggal: d.mulaiTanggal,
    durasiHari: d.durasiHari,
    aktif: d.aktif,
  };
  const id = String(formData.get("id") ?? "").trim();
  try {
    if (id) {
      await ubahBaris(id, data);
    } else {
      await tambahInformasi(data);
    }
  } catch {
    return { ok: false, pesan: "Gagal menyimpan pesan informasi." };
  }
  revalidatePath("/admin/informasi");
  return {
    ok: true,
    pesan: id ? "Pesan informasi berhasil diubah." : "Pesan informasi berhasil dibuat.",
  };
}

/** Nyalakan/matikan satu pesan tanpa mengubah isinya. */
export async function ubahAktifInformasi(
  id: string,
  aktif: boolean,
): Promise<HasilInformasi> {
  await wajibAkses("informasi");
  try {
    await ubahAktifBaris(id, aktif);
  } catch {
    return { ok: false, pesan: "Gagal mengubah status pesan." };
  }
  revalidatePath("/admin/informasi");
  return {
    ok: true,
    pesan: aktif ? "Pesan diaktifkan." : "Pesan dinonaktifkan.",
  };
}

/** Hapus satu pesan (tidak bisa dibatalkan). */
export async function hapusInformasi(id: string): Promise<HasilInformasi> {
  await wajibAkses("informasi");
  try {
    await hapusBaris(id);
  } catch {
    return { ok: false, pesan: "Gagal menghapus pesan." };
  }
  revalidatePath("/admin/informasi");
  return { ok: true, pesan: "Pesan informasi berhasil dihapus." };
}

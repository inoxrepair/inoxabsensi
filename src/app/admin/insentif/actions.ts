"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { jalankanSinkronInsentif, normalisasiNama } from "@/lib/insentif";
import { wajibAkses } from "@/lib/session";
import { periodeValid } from "@/lib/rekap";

export type HasilSinkronInsentif = {
  ok: boolean;
  pesan: string;
  detail?: any;
};

/**
 * Trigger sinkron insentif dari inox.my.id.
 * Memanggil jalankanSinkronInsentif langsung (bukan fetch ke API route),
 * karena cookie sesi tidak ikut terkirim pada fetch server-side dan
 * route akan menjawab 401.
 */
export async function sinkronInsentif(
  periode: string,
): Promise<HasilSinkronInsentif> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super_admin dapat sinkron insentif." };
  }

  if (!periodeValid(periode)) {
    return { ok: false, pesan: "Periode tidak valid." };
  }

  try {
    const hasil = await jalankanSinkronInsentif(periode);
    revalidatePath("/admin/insentif");
    return {
      ok: true,
      pesan: hasil.pesan,
      detail: hasil,
    };
  } catch (err: any) {
    return {
      ok: false,
      pesan: err?.message ?? "Sinkron gagal.",
    };
  }
}

/** Wrapper untuk <form action> — ambil periode dari FormData, kembalikan hasil sinkron supaya halaman bisa menampilkannya. */
export async function sinkronInsentifForm(
  _prev: HasilSinkronInsentif | undefined,
  formData: FormData,
): Promise<HasilSinkronInsentif> {
  const periode = formData.get("periode") as string;
  return sinkronInsentif(periode);
}

/** Ambil semua insentif untuk periode (admin). Admin cabang hanya tim cabangnya. */
export async function ambilInsentifAdmin(periode: string) {
  const admin = await wajibAkses("insentif");
  return db.insentif.findMany({
    where: {
      periode,
      ...(admin.role === "admin_cabang" && admin.cabangId
        ? { user: { cabangId: admin.cabangId } }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true, cabang: { select: { nama: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

/** Ambil insentif satu user untuk periode (karyawan lihat sendiri). */
export async function ambilInsentifSaya(userId: string, periode: string) {
  const admin = await wajibAkses("insentif");
  // karyawan hanya boleh lihat sendiri
  if (admin.role === "karyawan" && admin.id !== userId) {
    return null;
  }
  return db.insentif.findUnique({
    where: { userId_periode: { userId, periode } },
  });
}

/** Daftar pemetaan nama iNOX -> user (super_admin). */
export async function ambilPemetaanInsentif() {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return [];
  return db.pemetaanInsentif.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { namaInox: "asc" },
  });
}

/** Daftar pengguna aktif untuk dropdown pemetaan (super_admin). */
export async function ambilPenggunaAktif() {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return [];
  return db.user.findMany({
    where: { aktif: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type HasilPemetaan = {
  ok: boolean;
  pesan: string;
};

/**
 * Pasangkan satu nama iNOX ke satu akun pengguna. Sekali disimpan,
 * sinkron berikutnya otomatis memakai pemetaan ini. Bila nama yang sama
 * sudah terpetakan, pemetaan diperbarui ke akun yang dipilih.
 */
export async function simpanPemetaanInsentifForm(
  _prev: HasilPemetaan | undefined,
  formData: FormData,
): Promise<HasilPemetaan> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super_admin dapat mengatur pemetaan." };
  }
  const namaInox = ((formData.get("namaInox") as string) ?? "").trim();
  const userId = ((formData.get("userId") as string) ?? "").trim();
  if (!namaInox || !userId) {
    return { ok: false, pesan: "Nama iNOX dan karyawan wajib diisi." };
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, aktif: true },
  });
  if (!user || !user.aktif) {
    return { ok: false, pesan: "Karyawan tidak ditemukan atau tidak aktif." };
  }
  await db.pemetaanInsentif.upsert({
    where: { namaKunci: normalisasiNama(namaInox) },
    update: { namaInox, userId },
    create: {
      namaInox,
      namaKunci: normalisasiNama(namaInox),
      userId,
    },
  });
  revalidatePath("/admin/insentif");
  return {
    ok: true,
    pesan: `Nama "${namaInox}" dipetakan ke ${user.name}. Sinkron berikutnya otomatis memakai pemetaan ini.`,
  };
}

/** Hapus satu pemetaan nama iNOX (super_admin). */
export async function hapusPemetaanInsentif(formData: FormData): Promise<void> {
  const admin = await wajibAkses("insentif");
  if (admin.role !== "super_admin") return;
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return;
  await db.pemetaanInsentif.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/insentif");
}

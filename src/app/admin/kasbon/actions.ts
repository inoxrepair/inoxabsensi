"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { wajibLogin, wajibAkses } from "@/lib/session";
import { formatRupiah } from "@/lib/format";
import {
  ajukanKasbonSkema,
  bayarKasbonSkema,
  prosesKasbonSkema,
  sisaKasbon,
  statusSetelahBayar,
} from "@/lib/kasbon";

export type HasilKasbon = { ok: boolean; pesan: string };

function segarkan() {
  revalidatePath("/karyawan/kasbon");
  revalidatePath("/admin/kasbon");
}

/** Karyawan mengajukan kasbon untuk periode berjalan atau mendatang. */
export async function ajukanKasbon(
  _sebelumnya: HasilKasbon | undefined,
  formData: FormData,
): Promise<HasilKasbon> {
  const user = await wajibLogin();

  const parsed = ajukanKasbonSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  // Cegah pengajuan ganda di periode yang sama dengan status pending.
  const existing = await db.kasbon.findFirst({
    where: { userId: user.id, periode: parsed.data.periode, status: "pending" },
  });
  if (existing) {
    return { ok: false, pesan: "Anda sudah memiliki pengajuan kasbon pending di periode ini." };
  }

  await db.kasbon.create({
    data: {
      userId: user.id,
      jumlah: parsed.data.jumlah,
      periode: parsed.data.periode,
      keterangan: parsed.data.keterangan,
      status: "pending",
    },
  });

  segarkan();
  return { ok: true, pesan: "Pengajuan kasbon terkirim." };
}

/** Karyawan membatalkan pengajuannya sendiri yang masih pending. */
export async function batalkanKasbon(formData: FormData): Promise<HasilKasbon> {
  const user = await wajibLogin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, pesan: "Data kasbon tidak ditemukan." };

  const kasbon = await db.kasbon.findUnique({ where: { id } });
  if (!kasbon || kasbon.userId !== user.id) {
    return { ok: false, pesan: "Data kasbon tidak ditemukan." };
  }
  if (kasbon.status !== "pending") {
    return { ok: false, pesan: "Hanya kasbon pending yang bisa dibatalkan." };
  }

  await db.kasbon.update({
    where: { id },
    data: { status: "dibatalkan" },
  });
  segarkan();
  return { ok: true, pesan: "Kasbon dibatalkan. Anda bisa mengajukan lagi di periode ini." };
}

/** Admin mencatat pembayaran kasbon yang disetujui, penuh atau parsial. */
export async function catatBayarKasbon(formData: FormData): Promise<HasilKasbon> {
  const admin = await wajibAkses("kasbon");

  const parsed = bayarKasbonSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const kasbon = await db.kasbon.findUnique({ where: { id: parsed.data.id } });
  if (!kasbon) return { ok: false, pesan: "Data kasbon tidak ditemukan." };
  if (kasbon.status !== "disetujui") {
    return { ok: false, pesan: "Hanya kasbon yang disetujui bisa dibayar." };
  }

  if (admin.role !== "super_admin") {
    const pemilik = await db.user.findUnique({
      where: { id: kasbon.userId },
      select: { cabangId: true },
    });
    if (!pemilik || pemilik.cabangId !== admin.cabangId) {
      return { ok: false, pesan: "Kasbon di luar lingkup cabang Anda." };
    }
  }

  const sisa = sisaKasbon(kasbon);
  if (parsed.data.jumlahBayar > sisa) {
    return { ok: false, pesan: `Jumlah bayar melebihi sisa ${formatRupiah(sisa)}.` };
  }
  const terbayarBaru = kasbon.jumlahTerbayar + parsed.data.jumlahBayar;
  const statusBaru = statusSetelahBayar(kasbon.jumlah, terbayarBaru);
  await db.kasbon.update({
    where: { id: kasbon.id },
    data: { jumlahTerbayar: terbayarBaru, status: statusBaru },
  });
  segarkan();
  return {
    ok: true,
    pesan:
      statusBaru === "lunas"
        ? "Kasbon lunas."
        : `Pembayaran parsial tercatat. Sisa ${formatRupiah(kasbon.jumlah - terbayarBaru)}.`,
  };
}

/** Admin memproses kasbon: setujui, tolak, atau tandai lunas. */
export async function prosesKasbon(formData: FormData): Promise<HasilKasbon> {
  const admin = await wajibAkses("kasbon");

  const parsed = prosesKasbonSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const kasbon = await db.kasbon.findUnique({ where: { id: parsed.data.id } });
  if (!kasbon) {
    return { ok: false, pesan: "Data kasbon tidak ditemukan." };
  }

  if (admin.role !== "super_admin") {
    const pemilik = await db.user.findUnique({
      where: { id: kasbon.userId },
      select: { cabangId: true },
    });
    if (!pemilik || pemilik.cabangId !== admin.cabangId) {
      return { ok: false, pesan: "Kasbon di luar lingkup cabang Anda." };
    }
  }

  // Hanya pending yang bisa disetujui/ditolak; hanya disetujui yang bisa dilunasi.
  if (parsed.data.status === "lunas" && kasbon.status !== "disetujui") {
    return { ok: false, pesan: "Hanya kasbon yang disetujui dapat ditandai lunas." };
  }
  if (
    (parsed.data.status === "disetujui" || parsed.data.status === "ditolak") &&
    kasbon.status !== "pending"
  ) {
    return { ok: false, pesan: "Kasbon ini sudah diproses." };
  }

  await db.kasbon.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  segarkan();
  const label =
    parsed.data.status === "disetujui"
      ? "disetujui"
      : parsed.data.status === "ditolak"
        ? "ditolak"
        : "ditandai lunas";
  return { ok: true, pesan: `Kasbon ${label}.` };
}

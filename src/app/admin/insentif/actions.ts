"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { jalankanSinkronInsentif } from "@/lib/insentif";
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

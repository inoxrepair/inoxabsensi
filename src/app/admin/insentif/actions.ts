"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { periodeValid } from "@/lib/rekap";

export type HasilSinkronInsentif = {
  ok: boolean;
  pesan: string;
  detail?: any;
};

/** Trigger sinkron insentif dari inox.my.id via API route internal. */
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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://inoxabsensi.cloud";

  try {
    const res = await fetch(`${baseUrl}/api/insentif/sync?periode=${periode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        pesan: json?.error ?? "Sinkron gagal.",
        detail: json,
      };
    }

    revalidatePath("/admin/insentif");
    return {
      ok: true,
      pesan: json?.pesan ?? "Sinkron selesai.",
      detail: json,
    };
  } catch (err: any) {
    return {
      ok: false,
      pesan: err?.message ?? "Gagal memanggil API sinkron.",
    };
  }
}

/** Wrapper untuk <form action> — ambil periode dari FormData. */
export async function sinkronInsentifForm(
  formData: FormData,
): Promise<void> {
  const periode = formData.get("periode") as string;
  await sinkronInsentif(periode);
}

/** Ambil semua insentif untuk periode (admin). */
export async function ambilInsentifAdmin(periode: string) {
  const admin = await wajibAkses("insentif");
  return db.insentif.findMany({
    where: { periode },
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

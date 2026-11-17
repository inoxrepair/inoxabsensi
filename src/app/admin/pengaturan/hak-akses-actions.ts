"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  LABEL_ROLE,
  MENU_ADMIN,
  ROLE,
  type MenuAdmin,
  type RoleKaryawan,
} from "@/lib/domain";
import { bolehUbahHakAkses } from "@/lib/hak-akses";
import { wajibAkses } from "@/lib/session";

export type HasilHakAkses = { ok: boolean; pesan: string };

const JALUR_PENGATURAN = "/admin/pengaturan";

function bacaMenu(nilai: string): MenuAdmin | null {
  return (MENU_ADMIN as readonly string[]).includes(nilai)
    ? (nilai as MenuAdmin)
    : null;
}

function bacaRoleTarget(nilai: string): RoleKaryawan | null {
  return (ROLE as readonly string[]).includes(nilai)
    ? (nilai as RoleKaryawan)
    : null;
}

/**
 * Centang/hapus centang satu sel matriks Hak Akses. Hanya super admin —
 * guard ganda (wajibAkses("pengaturan") + cek role), supaya role lain yang
 * diberi "pengaturan" lewat database tetap tidak bisa mengedit matriks.
 */
export async function ubahHakAkses(
  formData: FormData,
): Promise<HasilHakAkses> {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") {
    return { ok: false, pesan: "Hanya super admin dapat mengubah hak akses." };
  }

  const role = bacaRoleTarget(String(formData.get("role") ?? ""));
  const menu = bacaMenu(String(formData.get("menu") ?? ""));
  const diizinkan = String(formData.get("diizinkan") ?? "") === "1";
  if (!role || !menu) {
    return { ok: false, pesan: "Role atau menu tidak valid." };
  }
  if (!bolehUbahHakAkses(role, menu, diizinkan)) {
    return {
      ok: false,
      pesan:
        "Super admin tidak dapat menghapus aksesnya sendiri ke Pengaturan.",
    };
  }

  if (diizinkan) {
    await db.rolePermission.upsert({
      where: { role_menu: { role, menu } },
      create: { role, menu },
      update: {},
    });
  } else {
    await db.rolePermission.deleteMany({ where: { role, menu } });
  }

  revalidatePath(JALUR_PENGATURAN);
  return {
    ok: true,
    pesan: `Akses ${LABEL_ROLE[role]} diperbarui.`,
  };
}

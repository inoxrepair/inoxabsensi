import type { MenuAdmin, RoleKaryawan } from "@/lib/domain";

/**
 * Pengaman editor Hak Akses: super admin tidak boleh mencabut aksesnya
 * sendiri ke menu Pengaturan — kalau itu terjadi, tidak ada yang bisa
 * membuka editor ini lagi untuk mengembalikannya.
 *
 * Pengaman ini saja sudah cukup: selama super admin memegang "pengaturan",
 * ia selalu punya ≥1 menu dan selalu bisa membuka editor untuk memperbaiki
 * apa pun, jadi tidak perlu aturan tambahan soal "menu terakhir".
 */
export function bolehUbahHakAkses(
  role: RoleKaryawan,
  menu: MenuAdmin,
  diizinkan: boolean,
): boolean {
  if (role === "super_admin" && menu === "pengaturan" && !diizinkan) {
    return false;
  }
  return true;
}

/** Menu yang berisi angka gaji (dikunci toggle Pengaturan untuk admin cabang). */
export const MENU_GAJI: readonly MenuAdmin[] = ["payroll", "slip-gaji"];

/**
 * Toggle Pengaturan "admin cabang boleh lihat gaji": bila mati, menu gaji
 * dicabut dari daftar izin admin_cabang — sidebar menyembunyikannya dan
 * wajibAkses menolak URL-nya. Role lain tidak terpengaruh.
 */
export function batasiMenuGajiAdminCabang(
  izin: Set<string>,
  role: RoleKaryawan,
  lihatGaji: boolean,
): Set<string> {
  if (role !== "admin_cabang" || lihatGaji) return izin;
  const hasil = new Set(izin);
  for (const menu of MENU_GAJI) hasil.delete(menu);
  return hasil;
}

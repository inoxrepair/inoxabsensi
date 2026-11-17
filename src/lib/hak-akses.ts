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

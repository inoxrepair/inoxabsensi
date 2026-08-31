/**
 * Tipe & label domain yang dipakai bersama UI, seed, dan query database.
 * SQLite tidak punya enum, jadi kolom string divalidasi di sini agar
 * tetap ada satu sumber kebenaran.
 */

export const ROLE = [
  "super_admin",
  "admin_cabang",
  "headstore",
  "karyawan",
] as const;
export type RoleKaryawan = (typeof ROLE)[number];

export const LABEL_ROLE: Record<RoleKaryawan, string> = {
  super_admin: "Super Admin",
  admin_cabang: "Admin Cabang",
  headstore: "Head Store",
  karyawan: "Karyawan",
};

/**
 * Role yang dibatasi ke satu cabang. Headstore berada di bawah admin cabang:
 * tetap bisa absen seperti karyawan, ditambah menyusun jadwal cabangnya.
 */
export function roleTerbatasCabang(role: RoleKaryawan): boolean {
  return role === "admin_cabang" || role === "headstore";
}

export const STATUS_ABSENSI = [
  "hadir",
  "telat",
  "alpa",
  "izin",
  "libur",
] as const;
export type StatusAbsensi = (typeof STATUS_ABSENSI)[number];

export const STATUS_KASBON = [
  "pending",
  "disetujui",
  "ditolak",
  "lunas",
] as const;
export type StatusKasbon = (typeof STATUS_KASBON)[number];

export const LABEL_KASBON: Record<StatusKasbon, string> = {
  pending: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  lunas: "Lunas",
};

function pembaca<T extends string>(daftar: readonly T[], fallback: T) {
  const set = new Set<string>(daftar);
  return (nilai: string): T => (set.has(nilai) ? (nilai as T) : fallback);
}

/** Normalisasi nilai kolom string dari database ke union yang aman. */
export const bacaRole = pembaca(ROLE, "karyawan");
export const bacaStatusAbsensi = pembaca(STATUS_ABSENSI, "alpa");
export const bacaStatusKasbon = pembaca(STATUS_KASBON, "pending");

/** Key menu admin; dicocokkan dengan tabel RolePermission. */
export const MENU_ADMIN = [
  "dashboard",
  "cabang",
  "karyawan",
  "jadwal",
  "rekap",
  "kasbon",
  "payroll",
  "pengaturan",
] as const;
export type MenuAdmin = (typeof MENU_ADMIN)[number];

/** Hak akses bawaan saat seed. Sesudah itu sumbernya tabel RolePermission. */
export const AKSES_DEFAULT: Record<RoleKaryawan, readonly MenuAdmin[]> = {
  super_admin: MENU_ADMIN,
  admin_cabang: ["dashboard", "karyawan", "jadwal", "rekap", "kasbon"],
  // Rekap pribadi tersedia di /karyawan/riwayat; akses admin Headstore
  // hanya untuk menyusun jadwal cabangnya.
  headstore: ["jadwal"],
  karyawan: [],
};

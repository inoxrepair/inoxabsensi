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
  "dibatalkan",
] as const;
export type StatusKasbon = (typeof STATUS_KASBON)[number];

export const LABEL_KASBON: Record<StatusKasbon, string> = {
  pending: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
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
  "absen",
  "cabang",
  "karyawan",
  "jadwal",
  "rekap",
  "kasbon",
  "payroll",
  "slip-gaji",
  "insentif",
  "informasi",
  "log-login",
  "chat",
  "top5",
  "pengaturan",
] as const;
export type MenuAdmin = (typeof MENU_ADMIN)[number];

/** Hak akses bawaan saat seed. Sesudah itu sumbernya tabel RolePermission. */
export const AKSES_DEFAULT: Record<RoleKaryawan, readonly MenuAdmin[]> = {
  super_admin: MENU_ADMIN,
  // Admin cabang bisa absen seperti karyawan (jadwal shift-nya sudah ada,
  // server action absen memang tidak membatasi role); menunya mengarah ke
  // halaman absen /karyawan yang sama.
  // Admin cabang memegang semua menu kecuali yang memang global:
  // "cabang" (mengelola cabang lain), "informasi" (broadcast semua cabang,
  // modelnya tidak punya cabangId), dan "pengaturan" (memuat editor Hak
  // Akses — memberikannya membuka eskalasi hak sendiri). Semua halaman
  // yang dibuka di sini memaksa data ke cabang admin itu sendiri;
  // "payroll" + "slip-gaji" tambahan dikunci toggle Pengaturan
  // admin_cabang_lihat_gaji (lihat lib/session menuDiizinkan).
  admin_cabang: [
    "dashboard",
    "absen",
    "karyawan",
    "jadwal",
    "rekap",
    "kasbon",
    "payroll",
    "slip-gaji",
    "insentif",
    "log-login",
    "chat",
    "top5",
  ],
  // Rekap pribadi tersedia di /karyawan/riwayat; akses admin Headstore
  // hanya untuk menyusun jadwal cabangnya.
  headstore: ["dashboard", "absen", "jadwal", "chat", "top5"],
  karyawan: [],
};

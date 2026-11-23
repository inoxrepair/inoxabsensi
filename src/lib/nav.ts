import type { Route } from "next";

export type NavItem = {
  href: Route;
  label: string;
  /** key menu, nantinya dicocokkan dengan tabel role_permission */
  menu: string;
  /** true = tampil langsung di bottom bar; false = masuk lembar "Lainnya" */
  utama?: boolean;
  /** kategori pengelompokan di sidebar admin; hanya dipakai ADMIN_NAV */
  kategori?: KategoriAdminNav;
};

/** Kategori pengelompokan menu admin di sidebar, sesuai urutan tampil. */
export const KATEGORI_ADMIN_NAV = [
  "Utama",
  "Karyawan",
  "Absensi",
  "Keuangan",
  "Lainnya",
] as const;
export type KategoriAdminNav = (typeof KATEGORI_ADMIN_NAV)[number];

/** Menu admin (sidebar, desktop) */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", menu: "dashboard", kategori: "Utama" },
  // Absen membuka halaman absen /karyawan yang sama (tombol + GPS + shift);
  // server action absen tidak membatasi role, jadi admin cabang yang
  // punya jadwal shift bisa absen seperti karyawan.
  { href: "/karyawan", label: "Absen", menu: "absen", kategori: "Utama" },
  { href: "/admin/cabang", label: "Cabang", menu: "cabang", kategori: "Karyawan" },
  { href: "/admin/karyawan", label: "Karyawan", menu: "karyawan", kategori: "Karyawan" },
  { href: "/admin/log-absensi", label: "Log Absensi", menu: "karyawan", kategori: "Absensi" },
  { href: "/admin/log-login", label: "Log Login", menu: "log-login", kategori: "Absensi" },
  { href: "/admin/izin", label: "Izin", menu: "karyawan", kategori: "Absensi" },
  { href: "/admin/jadwal", label: "Jadwal Shift", menu: "jadwal", kategori: "Karyawan" },
  { href: "/admin/rekap", label: "Rekap Absensi", menu: "rekap", kategori: "Absensi" },
  { href: "/admin/kasbon", label: "Kasbon", menu: "kasbon", kategori: "Keuangan" },
  { href: "/admin/payroll", label: "Payroll", menu: "payroll", kategori: "Keuangan" },
  { href: "/admin/slip-gaji", label: "Slip Gaji", menu: "slip-gaji", kategori: "Keuangan" },
  { href: "/admin/insentif", label: "Insentif", menu: "insentif", kategori: "Keuangan" },
  { href: "/admin/informasi", label: "Informasi", menu: "informasi", kategori: "Lainnya" },
  { href: "/admin/top5", label: "Top 10", menu: "top5", kategori: "Lainnya" },
  { href: "/admin/pengaturan", label: "Pengaturan", menu: "pengaturan", kategori: "Lainnya" },
];

/** Menu karyawan (bottom navigation, mobile): 4 utama + Lainnya. */
export const KARYAWAN_NAV: NavItem[] = [
  { href: "/karyawan/jadwal", label: "Jadwal", menu: "jadwal_saya", utama: true },
  { href: "/karyawan/izin", label: "Izin", menu: "izin_saya", utama: true },
  // Absen di tengah (indeks 2 dari 5) dan ditampilkan menonjol: tombol bulat
  // naik di atas bar — menu yang paling sering dipakai karyawan.
  { href: "/karyawan", label: "Absen", menu: "absen", utama: true },
  { href: "/karyawan/top5", label: "Top 10", menu: "top5", utama: true },
  { href: "/karyawan/riwayat", label: "Riwayat", menu: "riwayat_saya" },
  { href: "/karyawan/kasbon", label: "Kasbon", menu: "kasbon_saya" },
  { href: "/karyawan/insentif", label: "Insentif", menu: "insentif_saya" },
  { href: "/karyawan/profil", label: "Profil", menu: "profil" },
];

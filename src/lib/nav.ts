import type { Route } from "next";

export type NavItem = {
  href: Route;
  label: string;
  /** key menu, nantinya dicocokkan dengan tabel role_permission */
  menu: string;
  /** true = tampil langsung di bottom bar; false = masuk lembar "Lainnya" */
  utama?: boolean;
};

/** Menu admin (sidebar, desktop) */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", menu: "dashboard" },
  { href: "/admin/cabang", label: "Cabang", menu: "cabang" },
  { href: "/admin/karyawan", label: "Karyawan", menu: "karyawan" },
  { href: "/admin/log-absensi", label: "Log Absensi", menu: "karyawan" },
  { href: "/admin/log-login", label: "Log Login", menu: "log-login" },
  { href: "/admin/izin", label: "Izin", menu: "karyawan" },
  { href: "/admin/jadwal", label: "Jadwal Shift", menu: "jadwal" },
  { href: "/admin/rekap", label: "Rekap Absensi", menu: "rekap" },
  { href: "/admin/kasbon", label: "Kasbon", menu: "kasbon" },
  { href: "/admin/payroll", label: "Payroll", menu: "payroll" },
  { href: "/admin/insentif", label: "Insentif", menu: "insentif" },
  { href: "/admin/informasi", label: "Informasi", menu: "informasi" },
  { href: "/admin/chat", label: "Chat", menu: "chat" },
  { href: "/admin/pengaturan", label: "Pengaturan", menu: "pengaturan" },
];

/** Menu karyawan (bottom navigation, mobile): 5 utama + Lainnya. */
export const KARYAWAN_NAV: NavItem[] = [
  { href: "/karyawan", label: "Absen", menu: "absen", utama: true },
  { href: "/karyawan/jadwal", label: "Jadwal", menu: "jadwal_saya", utama: true },
  { href: "/karyawan/chat", label: "Chat", menu: "chat", utama: true },
  { href: "/karyawan/top5", label: "Top 10", menu: "top5", utama: true },
  { href: "/karyawan/riwayat", label: "Riwayat", menu: "riwayat_saya" },
  { href: "/karyawan/kasbon", label: "Kasbon", menu: "kasbon_saya" },
  { href: "/karyawan/izin", label: "Izin", menu: "izin_saya" },
  { href: "/karyawan/insentif", label: "Insentif", menu: "insentif_saya" },
  { href: "/karyawan/profil", label: "Profil", menu: "profil" },
];

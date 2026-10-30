"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KARYAWAN_NAV } from "@/lib/nav";

/** Ikon minimalis (stroke only) agar konsisten dengan palet hitam-putih. */
const ICON: Record<string, React.ReactNode> = {
  absen: (
    <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  ),
  jadwal_saya: (
    <path d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
  ),
  riwayat_saya: <path d="M4 6h16M4 12h16M4 18h10" />,
  kasbon_saya: (
    <path d="M4 7h16v10H4zM8 11h5m4 0h.01" />
  ),
  izin_saya: (
    <path d="M5 4h14v16H5zM9 12l2 2 4-4" />
  ),
  profil: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
  ),
};

export function KaryawanBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu karyawan"
      className="sticky bottom-0 z-10 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {KARYAWAN_NAV.map((item) => {
          const active =
            item.href === "/karyawan"
              ? pathname === "/karyawan"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                  active ? "font-medium text-ink" : "text-muted"
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICON[item.menu]}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

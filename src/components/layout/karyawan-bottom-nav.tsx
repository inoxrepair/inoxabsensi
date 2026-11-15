"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  chat: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  ),
  insentif_saya: (
    <>
      <path d="M4 17.5l5-6 3.5 3L20 7" />
      <path d="M15.5 7H20v4.5" />
    </>
  ),
  top5: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1" />
    </>
  ),
  lainnya: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
};

function ikon(menu: string, aktif: boolean) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={aktif ? 2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON[menu]}
    </svg>
  );
}

/**
 * Bottom bar karyawan: 5 menu utama (Absen, Jadwal, Chat, Top 5, Lainnya)
 * + lembar "Lainnya" untuk menu sisanya (Riwayat, Kasbon, Izin, Insentif,
 * Profil). Bar tetap ringkas; semua menu tetap satu ketukan jauhnya.
 */
export function KaryawanBottomNav() {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);

  const utama = KARYAWAN_NAV.filter((i) => i.utama);
  const lainnya = KARYAWAN_NAV.filter((i) => !i.utama);
  const aktifLainnya = lainnya.some((item) =>
    item.href === "/karyawan"
      ? pathname === "/karyawan"
      : pathname.startsWith(item.href),
  );

  return (
    <>
      <nav
        aria-label="Menu karyawan"
        className="sticky bottom-3 z-10 mx-3 mb-3 rounded-full border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/10 dark:shadow-black/60 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md">
          {utama.map((item) => {
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
                  {ikon(item.menu, active)}
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setBuka(true)}
              aria-expanded={buka}
              aria-label="Menu lainnya"
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                aktifLainnya ? "font-medium text-ink" : "text-muted"
              }`}
            >
              {ikon("lainnya", aktifLainnya)}
              Lainnya
            </button>
          </li>
        </ul>
      </nav>

      {buka ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-label="Menu lainnya"
        >
          <button
            type="button"
            aria-label="Tutup menu lainnya"
            onClick={() => setBuka(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-3xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 shadow-xl backdrop-blur-xl p-2 pb-[env(safe-area-inset-bottom)]">
            <ul>
              {lainnya.map((item) => {
                const active =
                  item.href === "/karyawan"
                    ? pathname === "/karyawan"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setBuka(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${
                        active ? "font-medium text-ink bg-surface" : ""
                      }`}
                    >
                      {ikon(item.menu, active)}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setBuka(false)}
              className="mt-1 w-full rounded-2xl bg-ink py-3 text-sm font-medium text-paper"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

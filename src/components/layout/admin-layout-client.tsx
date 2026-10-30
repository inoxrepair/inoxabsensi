"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { TombolKeluar } from "@/components/layout/tombol-keluar";
import type { NavItem } from "@/lib/nav";

/**
 * Shell admin: sidebar desktop yang bisa diciutkan/dibentangkan + drawer
 * HP. Satu tombol toggle untuk desktop (di header sidebar); di HP tombol
 * hamburger di header membuka drawer yang sama. Pilihan ciutkan disimpan
 * di localStorage dan baru diterapkan setelah mount, supaya tidak ada
 * hydration mismatch (server dan render pertama selalu expanded).
 */
const KUNCI_SIDEBAR = "inox-admin-sidebar-collapsed";

/** Singkatan ubin saat sidebar diciutkan (tanpa library ikon baru). */
const SINGKATAN: Record<string, string> = {
  "/admin": "Da",
  "/admin/cabang": "Ca",
  "/admin/karyawan": "Kar",
  "/admin/log-absensi": "LA",
  "/admin/izin": "Iz",
  "/admin/jadwal": "Ja",
  "/admin/rekap": "Re",
  "/admin/kasbon": "Kas",
  "/admin/payroll": "Pa",
  "/admin/pengaturan": "Pen",
};

function singkatan(item: NavItem): string {
  if (SINGKATAN[item.href]) return SINGKATAN[item.href];
  return item.label
    .split(/\s+/)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminLayoutClient({
  menu,
  nama,
  labelRole,
  children,
}: {
  menu: NavItem[];
  nama: string;
  labelRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ciut, setCiut] = useState(false);
  const [drawerBuka, setDrawerBuka] = useState(false);

  useEffect(() => {
    try {
      setCiut(window.localStorage.getItem(KUNCI_SIDEBAR) === "1");
    } catch {
      // localStorage tidak tersedia: tetap expanded, aplikasi jalan normal.
    }
  }, []);

  function toggleCiut() {
    setCiut((sebelum) => {
      const berikut = !sebelum;
      try {
        window.localStorage.setItem(KUNCI_SIDEBAR, berikut ? "1" : "0");
      } catch {
        // Abaikan kegagalan simpan; state tetap berubah di sesi ini.
      }
      return berikut;
    });
  }

  const aktif = (item: NavItem) =>
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop: expanded w-60 dengan label, ciut w-16 dengan ubin. */}
      <aside
        className={`hidden shrink-0 border-r border-line bg-paper transition-all md:flex md:flex-col ${
          ciut ? "w-16" : "w-60"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-line ${
            ciut ? "justify-center px-2" : "justify-between px-3"
          }`}
        >
          {!ciut ? <Logo size={28} /> : null}
          <button
            type="button"
            onClick={toggleCiut}
            aria-label={ciut ? "Bentangkan sidebar" : "Ciutkan sidebar"}
            title={ciut ? "Bentangkan sidebar" : "Ciutkan sidebar"}
            className="rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            {ciut ? "»" : "« Ciutkan"}
          </button>
        </div>

        <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {menu.map((item) => {
              const isAktif = aktif(item);
              if (ciut) {
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={isAktif ? "page" : undefined}
                      className={`mx-auto grid size-10 place-items-center rounded-lg text-xs font-medium transition-colors ${
                        isAktif
                          ? "bg-ink text-paper"
                          : "text-muted hover:bg-surface hover:text-ink"
                      }`}
                    >
                      {singkatan(item)}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isAktif ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isAktif
                        ? "bg-ink font-medium text-paper"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-line bg-paper px-4 md:px-6">
          <div className="flex items-center gap-2">
            {/* Hamburger HP saja (md:hidden); desktop memakai toggle sidebar. */}
            <button
              type="button"
              onClick={() => setDrawerBuka(true)}
              aria-label="Buka menu"
              aria-expanded={drawerBuka}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium md:hidden"
            >
              ☰
            </button>
            <div className="md:hidden">
              <Logo size={26} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{nama}</p>
              <p className="text-xs text-muted">{labelRole}</p>
            </div>
            <div
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-ink text-sm font-medium text-paper"
            >
              {inisial(nama)}
            </div>
            <TombolKeluar className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* Drawer HP: overlay + panel. Memilih menu menutup drawer; tombol
          keluar tetap ada di footer drawer karena drawer menutupi header. */}
      {drawerBuka ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setDrawerBuka(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-paper shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo size={26} />
              <button
                type="button"
                onClick={() => setDrawerBuka(false)}
                aria-label="Tutup menu"
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium"
              >
                ✕
              </button>
            </div>
            <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {menu.map((item) => {
                  const isAktif = aktif(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerBuka(false)}
                        aria-current={isAktif ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          isAktif
                            ? "bg-ink font-medium text-paper"
                            : "text-muted hover:bg-surface hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-t border-line p-4">
              <TombolKeluar className="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

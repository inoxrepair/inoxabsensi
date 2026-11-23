"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { TombolKeluar } from "@/components/layout/tombol-keluar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { IkonMenu } from "@/components/ui/ikon-menu";
import { LencanaJumlah } from "@/components/ui/lencana-jumlah";
import { KATEGORI_ADMIN_NAV } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

/**
 * Shell admin: sidebar desktop yang bisa diciutkan/dibentangkan + drawer
 * HP. Satu tombol toggle untuk desktop (di header sidebar); di HP tombol
 * hamburger di header membuka drawer yang sama. Pilihan ciutkan disimpan
 * di localStorage dan baru diterapkan setelah mount, supaya tidak ada
 * hydration mismatch (server dan render pertama selalu expanded).
 */
const KUNCI_SIDEBAR = "inox-admin-sidebar-collapsed";

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
  versiLogo,
  jmlPendingIzin = 0,
  children,
}: {
  menu: NavItem[];
  nama: string;
  labelRole: string;
  versiLogo: string | null;
  /** Pengajuan izin pending dalam lingkup admin (lencana menu Izin). */
  jmlPendingIzin?: number;
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

  /**
   * Menu dikelompokkan berdasarkan kategori. `menu` sudah disaring hak
   * akses di layout server, jadi grup yang kosong untuk role ini otomatis
   * tidak tampil. Item tanpa kategori (seharusnya tidak ada) jatuh ke
   * "Lainnya" supaya tidak hilang diam-diam dari sidebar.
   */
  const grupMenu = KATEGORI_ADMIN_NAV.map((kategori) => ({
    kategori,
    item: menu.filter((n) => (n.kategori ?? "Lainnya") === kategori),
  })).filter((g) => g.item.length > 0);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop: expanded w-60 dengan label, ciut w-16 dengan ubin. */}
      <aside
        className={`hidden shrink-0 border-r border-white/50 dark:border-white/10 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl transition-all md:flex md:flex-col ${
          ciut ? "w-16" : "w-60"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-white/50 dark:border-white/10 ${
            ciut ? "justify-center px-2" : "justify-between px-3"
          }`}
        >
          {!ciut ? <Logo size={40} versi={versiLogo} /> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleCiut}
            aria-label={ciut ? "Bentangkan sidebar" : "Ciutkan sidebar"}
            title={ciut ? "Bentangkan sidebar" : "Ciutkan sidebar"}
            className="px-2 text-xs text-muted hover:text-ink"
          >
            {ciut ? "»" : "« Ciutkan"}
          </Button>
        </div>

        <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
          {ciut ? (
            <ul className="space-y-1">
              {menu.map((item) => {
                const isAktif = aktif(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={isAktif ? "page" : undefined}
                      className={`relative mx-auto grid size-10 place-items-center rounded-lg transition-colors ${
                        isAktif
                          ? "bg-ink text-paper"
                          : "text-muted hover:bg-white/70 dark:bg-zinc-900/60 hover:text-ink"
                      }`}
                    >
                      <IkonMenu href={item.href} className="size-5" />
                      {item.href === "/admin/izin" ? (
                        <LencanaJumlah
                          jumlah={jmlPendingIzin}
                          className="absolute -top-1 -right-1"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-1">
              {grupMenu.map((grup) => (
                <li key={grup.kategori} className="pt-3 first:pt-0">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {grup.kategori}
                  </p>
                  <ul className="space-y-1">
                    {grup.item.map((item) => {
                      const isAktif = aktif(item);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={isAktif ? "page" : undefined}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isAktif
                                ? "bg-ink font-medium text-paper"
                                : "text-muted hover:bg-white/70 dark:bg-zinc-900/60 hover:text-ink"
                            }`}
                          >
                            <IkonMenu href={item.href} className="size-5 shrink-0" />
                            {item.label}
                            {item.href === "/admin/izin" ? (
                              <LencanaJumlah
                                jumlah={jmlPendingIzin}
                                className="ml-auto"
                              />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-white/50 dark:border-white/10 bg-white/55 dark:bg-zinc-900/55 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2">
            {/* Hamburger HP saja (md:hidden); desktop memakai toggle sidebar. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrawerBuka(true)}
              aria-label="Buka menu"
              aria-expanded={drawerBuka}
              className="text-sm md:hidden"
            >
              ☰
            </Button>
            <div className="md:hidden">
              <Logo size={36} versi={versiLogo} />
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

      {/* Drawer HP: dialog geser dari kiri. Memilih menu menutup drawer;
          tombol keluar tetap ada di footer drawer karena drawer menutupi
          header. Tombol X penutup disediakan DialogContent. */}
      <Dialog open={drawerBuka} onOpenChange={setDrawerBuka}>
        <DialogContent
          aria-label="Menu admin"
          className="inset-y-0 left-0 top-0 flex w-72 max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-white/75 p-0 shadow-xl dark:bg-zinc-900/70 md:hidden"
        >
          <DialogTitle className="sr-only">Menu admin</DialogTitle>
          <div className="flex h-16 items-center justify-between border-b border-white/50 dark:border-white/10 px-4">
            <Logo size={36} versi={versiLogo} />
          </div>
          <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {grupMenu.map((grup) => (
                <li key={grup.kategori} className="pt-3 first:pt-0">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {grup.kategori}
                  </p>
                  <ul className="space-y-1">
                    {grup.item.map((item) => {
                      const isAktif = aktif(item);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setDrawerBuka(false)}
                            aria-current={isAktif ? "page" : undefined}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isAktif
                                ? "bg-ink font-medium text-paper"
                                : "text-muted hover:bg-white/70 dark:bg-zinc-900/60 hover:text-ink"
                            }`}
                          >
                            <IkonMenu href={item.href} className="size-5 shrink-0" />
                            {item.label}
                            {item.href === "/admin/izin" ? (
                              <LencanaJumlah
                                jumlah={jmlPendingIzin}
                                className="ml-auto"
                              />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-white/50 dark:border-white/10 p-4">
            <TombolKeluar className="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

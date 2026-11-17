"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LencanaJumlah } from "@/components/ui/lencana-jumlah";
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

function ikon(menu: string, aktif: boolean, ukuran = 22) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
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

function apakahAktif(href: string, pathname: string) {
  return href === "/karyawan"
    ? pathname === "/karyawan"
    : pathname.startsWith(href);
}

/**
 * Bottom bar karyawan: 5 slot (Jadwal, Chat, Absen tengah, Top 10, Lainnya)
 * + lembar "Lainnya" untuk menu sisanya (Riwayat, Kasbon, Izin, Insentif,
 * Profil). Absen di tengah ditampilkan menonjol: tombol bulat naik di atas
 * bar (menu yang paling sering dipakai). Pil penanda aktif (latar ink)
 * bergeser halus mengikuti menu yang dipilih — ikon + teks tiap slot diangkat
 * di atas pil (z-10) supaya tidak tertutup pil, seperti perbaikan tab Top 10.
 * Bar tetap ringkas; semua menu tetap satu ketukan jauhnya.
 */
export function KaryawanBottomNav({
  jmlBelumDibacaChat = 0,
}: {
  jmlBelumDibacaChat?: number;
}) {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);

  const utama = KARYAWAN_NAV.filter((i) => i.utama);
  const lainnya = KARYAWAN_NAV.filter((i) => !i.utama);
  const aktifLainnya = lainnya.some((item) =>
    apakahAktif(item.href, pathname),
  );

  // Indeks slot aktif untuk pil geser: 0 Jadwal, 1 Chat, 2 Absen, 3 Top 10,
  // 4 Lainnya. Fallback ke Absen bila tidak ada yang cocok (tak seharusnya
  // terjadi — semua halaman karyawan ada di daftar nav).
  const indeksUtama = utama.findIndex((item) =>
    apakahAktif(item.href, pathname),
  );
  const indeksAktif = aktifLainnya ? 4 : indeksUtama === -1 ? 2 : indeksUtama;

  return (
    <>
      <nav
        aria-label="Menu karyawan"
        className="sticky bottom-3 z-10 mx-3 mb-3 rounded-full border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/10 dark:shadow-black/60 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="relative mx-auto flex max-w-md">
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-0 top-1 w-1/5 rounded-full bg-ink transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${indeksAktif * 100}%)` }}
          />
          {utama.map((item) => {
            const active = apakahAktif(item.href, pathname);

            // Slot tengah (Absen): tombol bulat naik di atas bar.
            if (item.menu === "absen") {
              return (
                <li key={item.href} className="relative z-10 flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                      active ? "font-medium text-paper" : "text-muted"
                    }`}
                  >
                    <span
                      className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-black/20 transition-colors ${
                        active ? "bg-ink text-paper" : "bg-surface text-ink"
                      }`}
                    >
                      {ikon(item.menu, active, 26)}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.href} className="relative z-10 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                    active ? "font-medium text-paper" : "text-muted"
                  }`}
                >
                  <span className="relative">
                    {ikon(item.menu, active)}
                    {item.menu === "chat" ? (
                      <LencanaJumlah
                        jumlah={jmlBelumDibacaChat}
                        className="absolute -top-1.5 -right-2.5"
                      />
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="relative z-10 flex-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBuka(true)}
              aria-expanded={buka}
              aria-label="Menu lainnya"
              className={`min-h-14 w-full flex-col gap-1 py-2 text-[11px] hover:bg-transparent [&_svg]:size-[22px] ${
                aktifLainnya ? "font-medium text-paper" : "font-normal text-muted"
              }`}
            >
              {ikon("lainnya", aktifLainnya)}
              Lainnya
            </Button>
          </li>
        </ul>
      </nav>

      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="bottom-3 left-3 right-3 top-auto w-auto max-w-none translate-x-0 translate-y-0 gap-2 rounded-3xl p-2 pb-[env(safe-area-inset-bottom)]">
          <DialogTitle className="sr-only">Menu lainnya</DialogTitle>
          <ul>
            {lainnya.map((item) => {
              const active = apakahAktif(item.href, pathname);
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
          <Button
            type="button"
            onClick={() => setBuka(false)}
            className="mt-1 h-auto w-full rounded-2xl py-3"
          >
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

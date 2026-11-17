import Link from "next/link";

/**
 * Pindah Daftar Slip / Riwayat. Tautan biasa (bukan tab client) supaya
 * tiap halaman punya filter sendiri lewat query dan bisa dibuka langsung.
 */
export function NavigasiSlip({ aktif }: { aktif: "daftar" | "riwayat" }) {
  const tautan = (aktifkah: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      aktifkah
        ? "bg-ink text-paper"
        : "text-muted hover:bg-white/70 dark:hover:bg-zinc-900/60 hover:text-ink"
    }`;

  return (
    <nav
      aria-label="Slip gaji"
      className="mb-4 inline-flex gap-1 rounded-full border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-1 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl"
    >
      <Link
        href="/admin/slip-gaji"
        aria-current={aktif === "daftar" ? "page" : undefined}
        className={tautan(aktif === "daftar")}
      >
        Daftar Slip
      </Link>
      <Link
        href="/admin/slip-gaji/riwayat"
        aria-current={aktif === "riwayat" ? "page" : undefined}
        className={tautan(aktif === "riwayat")}
      >
        Riwayat
      </Link>
    </nav>
  );
}

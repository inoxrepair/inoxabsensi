import { KaryawanBottomNav } from "@/components/layout/karyawan-bottom-nav";
import { LatarLiquid } from "@/components/ui/latar-liquid";
import { hitungIzinDiproses } from "@/lib/izin-data";
import { wajibLogin } from "@/lib/session";
import Link from "next/link";

export default async function KaryawanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Semua halaman karyawan butuh sesi; proxy sudah menjaga, ini lapis kedua.
  const user = await wajibLogin();
  const jmlIzinDiproses = await hitungIzinDiproses(user.id);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <LatarLiquid />
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        {/* Headstore & admin cabang membuka halaman absen ini dari sidebar
            admin (menu Absen); tautan ini jalan pulang ke /admin — tanpa
            ini mereka terjebak di tampilan karyawan. */}
        {user.role === "headstore" || user.role === "admin_cabang" ? (
          <Link
            href="/admin"
            className="mb-5 block rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-4 py-2.5 text-center text-sm font-medium"
          >
            Dashboard cabang
          </Link>
        ) : null}
        {children}
      </main>
      <KaryawanBottomNav jmlIzinDiproses={jmlIzinDiproses} />
    </div>
  );
}

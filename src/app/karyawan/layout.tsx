import { KaryawanBottomNav } from "@/components/layout/karyawan-bottom-nav";
import { wajibLogin } from "@/lib/session";
import Link from "next/link";

export default async function KaryawanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Semua halaman karyawan butuh sesi; proxy sudah menjaga, ini lapis kedua.
  const user = await wajibLogin();

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        {user.role === "headstore" ? (
          <Link
            href="/admin/jadwal"
            className="mb-5 block rounded-xl border border-line bg-paper px-4 py-2.5 text-center text-sm font-medium"
          >
            Kelola jadwal cabang
          </Link>
        ) : null}
        {children}
      </main>
      <KaryawanBottomNav />
    </div>
  );
}

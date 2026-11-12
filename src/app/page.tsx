import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { LatarLiquid } from "@/components/ui/latar-liquid";
import { LiquidGlass } from "@/components/ui/liquid-glass";

export default async function HomePage() {
  const sesi = await auth();

  // Sudah login: langsung ke area sesuai role, tidak perlu halaman perantara.
  if (sesi?.user) {
    redirect(
      sesi.user.role === "karyawan" ? "/karyawan" : "/admin",
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <LatarLiquid />

      <LiquidGlass
        variant="regular"
        tint="rgba(255, 255, 255, 0.6)"
        cornerRadius={32}
        className="p-7 sm:p-8"
      >
        <Logo size={64} />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          Absensi iNox
        </h1>
        <p className="mt-2 text-sm text-muted">
          Masuk untuk mencatat kehadiran atau mengelola data cabang. Anda akan
          diarahkan sesuai role akun.
        </p>

        <LiquidGlass
          interactive
          variant="regular"
          tint="rgba(17, 17, 17, 0.85)"
          cornerRadius={20}
          className="mt-8"
        >
          <Link
            href="/login"
            className="block px-4 py-3 text-center text-sm font-medium text-white"
          >
            Masuk
          </Link>
        </LiquidGlass>
      </LiquidGlass>
    </main>
  );
}

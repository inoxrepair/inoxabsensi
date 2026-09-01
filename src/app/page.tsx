import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";

export default async function HomePage() {
  const sesi = await auth();

  // Sudah login: langsung ke area sesuai role, tidak perlu halaman perantara.
  if (sesi?.user) {
    redirect(
      sesi.user.role === "karyawan" ? "/karyawan" : "/admin",
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Logo size={40} />

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Absensi iNox
      </h1>
      <p className="mt-2 text-sm text-muted">
        Masuk untuk mencatat kehadiran atau mengelola data cabang. Anda akan
        diarahkan sesuai role akun.
      </p>

      <Link
        href="/login"
        className="mt-8 block rounded-xl bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
      >
        Masuk
      </Link>
    </main>
  );
}

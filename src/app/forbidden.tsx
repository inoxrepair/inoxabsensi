import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <div className="flex justify-center">
        <Logo size={40} />
      </div>
      <h1 className="mt-8 text-lg font-semibold tracking-tight">
        Akses ditolak
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Role Anda tidak memiliki izin untuk membuka halaman ini. Hubungi
        administrator bila ini seharusnya bisa diakses.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium"
      >
        Kembali
      </Link>
    </main>
  );
}

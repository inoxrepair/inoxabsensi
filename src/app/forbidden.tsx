import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <div className="flex justify-center">
        <Logo size={64} />
      </div>
      <h1 className="mt-8 text-lg font-semibold tracking-tight">
        Akses ditolak
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Role Anda tidak memiliki izin untuk membuka halaman ini. Hubungi
        administrator bila ini seharusnya bisa diakses.
      </p>
      <Button
        asChild
        variant="glass"
        className="mt-6 h-auto rounded-2xl px-4 py-3 shadow-lg"
      >
        <Link href="/">Kembali</Link>
      </Button>
    </main>
  );
}

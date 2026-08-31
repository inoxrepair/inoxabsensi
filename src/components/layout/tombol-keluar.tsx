"use client";

import { useFormStatus } from "react-dom";
import { keluar } from "@/app/login/actions";

/** Tombol keluar; dipakai di header admin dan profil karyawan. */
export function TombolKeluar({
  className = "",
  label = "Keluar",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={keluar}>
      <Tombol className={className} label={label} />
    </form>
  );
}

function Tombol({ className, label }: { className: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-40`}
    >
      {pending ? "Keluar…" : label}
    </button>
  );
}

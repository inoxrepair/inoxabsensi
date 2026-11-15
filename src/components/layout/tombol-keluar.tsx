"use client";

import { useFormStatus } from "react-dom";
import { keluar } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

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
    <Button
      type="submit"
      disabled={pending}
      variant="outline"
      className={`h-auto ${className}`}
    >
      {pending ? "Keluar…" : label}
    </Button>
  );
}

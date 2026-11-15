"use client";

import { useActionState } from "react";
import { gantiPassword, type HasilPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormPassword() {
  const [hasil, kirim, pending] = useActionState<HasilPassword, FormData>(
    gantiPassword,
    undefined,
  );

  return (
    <form action={kirim} className="mt-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <p className="text-sm font-semibold">Ganti password</p>
      <div className="mt-3 space-y-3">
        <PasswordField name="passwordLama" label="Password lama" autoComplete="current-password" />
        <PasswordField name="passwordBaru" label="Password baru" autoComplete="new-password" minLength={8} />
        <PasswordField name="konfirmasi" label="Konfirmasi password baru" autoComplete="new-password" minLength={8} />
      </div>

      {hasil ? (
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {hasil.pesan}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-4 w-full">
        {pending ? "Menyimpan…" : "Ubah password"}
      </Button>
    </form>
  );
}

function PasswordField({ name, label, autoComplete, minLength }: { name: string; label: string; autoComplete: string; minLength?: number }) {
  return (
    <Label className="block text-xs font-normal text-muted">
      {label}
      <Input name={name} type="password" required minLength={minLength} autoComplete={autoComplete} className="mt-1.5 w-full text-base" />
    </Label>
  );
}

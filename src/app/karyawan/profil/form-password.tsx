"use client";

import { useActionState } from "react";
import { gantiPassword, type HasilPassword } from "./actions";

export function FormPassword() {
  const [hasil, kirim, pending] = useActionState<HasilPassword, FormData>(
    gantiPassword,
    undefined,
  );

  return (
    <form action={kirim} className="mt-4 rounded-xl border border-line bg-paper p-4">
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

      <button type="submit" disabled={pending} className="mt-4 w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40">
        {pending ? "Menyimpan…" : "Ubah password"}
      </button>
    </form>
  );
}

function PasswordField({ name, label, autoComplete, minLength }: { name: string; label: string; autoComplete: string; minLength?: number }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input name={name} type="password" required minLength={minLength} autoComplete={autoComplete} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-base" />
    </label>
  );
}

"use client";

import { useActionState } from "react";
import { masuk, masukGoogle, type StatusLogin } from "./actions";

export function FormLogin({
  next,
  googleAktif,
}: {
  next?: string;
  googleAktif: boolean;
}) {
  const [status, kirim, sedangKirim] = useActionState<StatusLogin, FormData>(
    masuk,
    undefined,
  );

  return (
    <>
      <form action={kirim} className="mt-8 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div>
          <label htmlFor="identifier" className="block text-sm font-medium">
            Username atau email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            placeholder="username atau nama@inox.co.id"
            aria-invalid={status ? true : undefined}
            aria-describedby={status ? "galat-login" : undefined}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-base placeholder:text-muted/70"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            aria-invalid={status ? true : undefined}
            aria-describedby={status ? "galat-login" : undefined}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-base placeholder:text-muted/70"
          />
        </div>

        {status ? (
          <p
            id="galat-login"
            role="alert"
            className="rounded-xl bg-status-alpa/10 px-3.5 py-2.5 text-sm text-status-alpa"
          >
            {status.pesan}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sedangKirim}
          className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-40"
        >
          {sedangKirim ? "Memproses…" : "Masuk"}
        </button>
      </form>

      {googleAktif ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">atau</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form action={masukGoogle} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
                />
              </svg>
              Masuk dengan Google
            </button>
          </form>
        </>
      ) : null}
    </>
  );
}

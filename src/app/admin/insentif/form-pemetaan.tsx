"use client";

import { useActionState } from "react";
import {
  simpanPemetaanInsentifForm,
  type HasilPemetaan,
} from "./actions";

/**
 * Form untuk memasangkan satu nama iNOX (yang tidak cocok saat sinkron)
 * ke satu akun pengguna. Sekali disimpan, sinkron berikutnya otomatis
 * memakai pemetaan ini — tidak perlu dipasangkan ulang.
 */
export function FormPemetaan({
  namaInox,
  pengguna,
}: {
  namaInox: string;
  pengguna: Array<{ id: string; name: string }>;
}) {
  const [hasil, kirim, sedangProses] = useActionState<
    HasilPemetaan | undefined,
    FormData
  >(simpanPemetaanInsentifForm, undefined);

  return (
    <div className="mt-1">
      <form action={kirim} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="namaInox" value={namaInox} />
        <span className="text-sm font-medium">{namaInox}</span>
        <span className="text-sm text-muted">→</span>
        <select
          name="userId"
          required
          defaultValue=""
          className="rounded border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-2 py-1 text-sm"
          aria-label={`Akun untuk ${namaInox}`}
        >
          <option value="" disabled>
            Pilih karyawan…
          </option>
          {pengguna.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={sedangProses}
          className="rounded-lg bg-ink px-3 py-1 text-sm font-medium text-paper hover:bg-ink/90 transition disabled:opacity-40"
        >
          {sedangProses ? "Menyimpan…" : "Hubungkan"}
        </button>
      </form>
      {hasil?.pesan ? (
        <p
          role="status"
          className={`mt-1 text-sm ${hasil.ok ? "text-status-hadir" : "text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}
    </div>
  );
}

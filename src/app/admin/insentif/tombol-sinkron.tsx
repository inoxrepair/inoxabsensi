"use client";

import { useActionState } from "react";
import { sinkronInsentifForm, type HasilSinkronInsentif } from "./actions";

/**
 * Tombol sinkron + hasil sinkron. Hasil WAJIB ditampilkan di halaman:
 * sebelumnya action mengembalikan void dan halaman tidak menampilkan
 * apa-apa, sehingga sinkron yang gagal (mis. kredensial belum diatur)
 * terlihat seperti "tidak terjadi apa-apa".
 */
export function TombolSinkron({ periode }: { periode: string }) {
  const [hasil, kirim, sedangProses] = useActionState<
    HasilSinkronInsentif | undefined,
    FormData
  >(sinkronInsentifForm, undefined);

  const tidakCocok: string[] = hasil?.detail?.tidakDicocokkan ?? [];

  return (
    <div>
      <form action={kirim} className="flex gap-2">
        <input type="hidden" name="periode" defaultValue={periode} />
        <button
          type="submit"
          disabled={sedangProses}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition disabled:opacity-40"
        >
          {sedangProses ? "Menyinkron…" : "Sinkron Insentif dari inox.my.id"}
        </button>
      </form>
      {hasil?.pesan ? (
        <p
          role="status"
          className={`mt-2 max-w-md rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasil.pesan}
          {tidakCocok.length > 0
            ? ` Nama tidak cocok: ${tidakCocok.join(", ")}.`
            : null}
        </p>
      ) : null}
    </div>
  );
}

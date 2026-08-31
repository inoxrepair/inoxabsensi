"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { undoRevision, type Hasil } from "./actions";

export type RevisionView = {
  id: string;
  aksi: string;
  createdAt: string;
};

/** Daftar undo tetap ringkas agar tidak mengganggu matriks utama. */
export function UndoJadwal({ revisions }: { revisions: RevisionView[] }) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [pesan, setPesan] = useState<Hasil | null>(null);
  const [pending, mulai] = useTransition();

  function undo(id: string) {
    if (!window.confirm("Batalkan perubahan jadwal ini? Data sebelumnya akan dipulihkan.")) return;
    mulai(async () => {
      const hasil = await undoRevision(id);
      setPesan(hasil);
      if (hasil.ok) router.refresh();
    });
  }

  return (
    <section className="mb-4 rounded-xl border border-line bg-paper p-3">
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        className="flex w-full items-center justify-between text-left text-sm font-medium"
      >
        <span>Undo perubahan jadwal</span>
        <span className="text-muted">{terbuka ? "Tutup" : `${revisions.length} tersimpan`}</span>
      </button>

      {terbuka ? (
        <div className="mt-3 border-t border-line pt-3">
          {revisions.length === 0 ? (
            <p className="text-sm text-muted">Belum ada perubahan yang dapat dibatalkan.</p>
          ) : (
            <ul className="space-y-2">
              {revisions.map((revision) => (
                <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{revision.aksi}</p>
                    <p className="text-xs text-muted tabular-nums">{revision.createdAt}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => undo(revision.id)}
                    className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    {pending ? "…" : "Undo"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pesan ? <p role="status" className={`mt-3 text-sm ${pesan.ok ? "text-status-hadir" : "text-status-alpa"}`}>{pesan.pesan}</p> : null}
          <p className="mt-3 text-xs text-muted">Undo memulihkan keadaan sebelum aksi, termasuk hari Off dan seragam.</p>
        </div>
      ) : null}
    </section>
  );
}

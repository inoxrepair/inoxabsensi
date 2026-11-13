"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  hapusInformasi,
  ubahAktifInformasi,
  type HasilInformasi,
} from "./actions";

/** Tombol tiap kartu pesan: ubah, nyalakan/matikan, dan hapus. */
export function TombolInformasi({
  id,
  aktif,
}: {
  id: string;
  aktif: boolean;
}) {
  const router = useRouter();
  const [pending, mulaiTransisi] = useTransition();
  const [pesan, setPesan] = useState<HasilInformasi>(undefined);

  function jalankan(aksi: () => Promise<HasilInformasi>) {
    setPesan(undefined);
    mulaiTransisi(async () => {
      setPesan(await aksi());
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/admin/informasi", query: { ubah: id } }}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
        >
          Ubah
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => jalankan(() => ubahAktifInformasi(id, !aktif))}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          {aktif ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Hapus pesan ini? Pesan tidak bisa dikembalikan."))
              return;
            jalankan(() => hapusInformasi(id));
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-status-alpa disabled:opacity-40"
        >
          Hapus
        </button>
      </div>
      {pesan ? (
        <p
          role="status"
          className={`mt-2 text-xs ${pesan.ok ? "text-status-hadir" : "text-status-alpa"}`}
        >
          {pesan.pesan}
        </p>
      ) : null}
    </div>
  );
}

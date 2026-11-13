"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  simpanNamaPerusahaan,
  type HasilNamaPerusahaan,
} from "./nama-perusahaan-actions";

/**
 * Form nama perusahaan di Pengaturan. Nama ini tampil di kanan atas slip
 * gaji karyawan. Dikosongkan lalu disimpan = kembali ke "iNOX Repair".
 */
export function FormNamaPerusahaan({ nilaiSaatIni }: { nilaiSaatIni: string }) {
  const router = useRouter();
  const [nama, setNama] = useState(nilaiSaatIni);
  const [hasil, setHasil] = useState<HasilNamaPerusahaan>(undefined);
  const [pending, setPending] = useState(false);

  async function simpan() {
    setPending(true);
    const data = new FormData();
    data.append("nama", nama);
    const res = await simpanNamaPerusahaan(data);
    setHasil(res);
    setPending(false);
    if (res?.ok) router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Nama ini tampil di kanan atas slip gaji karyawan, menggantikan
        &ldquo;iNox Absensi&rdquo;.
      </p>

      <input
        type="text"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        maxLength={100}
        placeholder="iNOX Repair"
        aria-label="Nama perusahaan"
        className="mt-3 w-full rounded-lg border border-line bg-white/60 px-3 py-2.5 text-sm dark:bg-zinc-900/60"
      />

      {hasil ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          {pending ? "Menyimpan…" : "Simpan nama perusahaan"}
        </button>
      </div>
    </div>
  );
}

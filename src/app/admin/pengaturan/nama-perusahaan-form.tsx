"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      <Input
        type="text"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        maxLength={100}
        placeholder="iNOX Repair"
        aria-label="Nama perusahaan"
        className="mt-3"
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
        <Button
          type="button"
          size="lg"
          onClick={() => void simpan()}
          disabled={pending}
        >
          {pending ? "Menyimpan…" : "Simpan nama perusahaan"}
        </Button>
      </div>
    </div>
  );
}

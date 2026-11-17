"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { LABEL_ROLE, type RoleKaryawan } from "@/lib/domain";
import { ubahHakAkses } from "./hak-akses-actions";

/**
 * Satu sel matriks Hak Akses. Klik langsung menyimpan (tanpa tombol
 * Simpan); gagal — mis. super admin mencabut Pengaturan untuk dirinya
 * sendiri — centang dikembalikan dan pesannya tampil di sel itu.
 */
export function CentangHakAkses({
  role,
  menu,
  label,
  diizinkan,
}: {
  role: RoleKaryawan;
  menu: string;
  label: string;
  diizinkan: boolean;
}) {
  const router = useRouter();
  const [tercentang, setTercentang] = useState(diizinkan);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ubah(nilai: boolean) {
    setTercentang(nilai);
    setPesan(null);
    startTransition(async () => {
      const data = new FormData();
      data.append("role", role);
      data.append("menu", menu);
      data.append("diizinkan", nilai ? "1" : "0");
      const hasil = await ubahHakAkses(data);
      if (!hasil.ok) {
        setTercentang(!nilai);
        setPesan(hasil.pesan);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Checkbox
        checked={tercentang}
        disabled={pending}
        onCheckedChange={(nilai) => ubah(nilai === true)}
        aria-label={`${label} untuk ${LABEL_ROLE[role]}`}
      />
      {pesan ? (
        <span role="alert" className="text-xs text-status-alpa">
          {pesan}
        </span>
      ) : null}
    </span>
  );
}

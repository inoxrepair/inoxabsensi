"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ubahAdminCabangLihatGaji } from "./gaji-admin-cabang-actions";

/**
 * Toggle "admin cabang boleh melihat gaji" di Pengaturan. Klik langsung
 * menyimpan (tanpa tombol Simpan), seperti centang matriks Hak Akses.
 */
export function CentangGajiAdminCabang({
  diizinkan,
}: {
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
      data.append("diizinkan", nilai ? "1" : "0");
      const hasil = await ubahAdminCabangLihatGaji(data);
      setPesan(hasil.pesan);
      if (!hasil.ok) {
        setTercentang(!nilai);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <Label
        htmlFor="admin-cabang-lihat-gaji"
        className="flex items-center gap-2 text-sm font-normal"
      >
        <Checkbox
          id="admin-cabang-lihat-gaji"
          checked={tercentang}
          disabled={pending}
          onCheckedChange={(nilai) => ubah(nilai === true)}
        />
        Admin cabang boleh melihat gaji cabangnya
      </Label>
      <p className="mt-2 text-sm text-muted">
        Bila aktif, menu Payroll dan Slip Gaji tampil untuk admin cabang dan
        hanya berisi data cabangnya sendiri. Bila mati, kedua menu itu hilang
        dari sidebar admin cabang dan URL-nya ditolak.
      </p>
      {pesan ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-status-hadir/10 px-3 py-2 text-sm text-status-hadir"
        >
          {pesan}
        </p>
      ) : null}
    </div>
  );
}

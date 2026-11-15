"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Select name="userId" required>
          <SelectTrigger
            aria-label={`Akun untuk ${namaInox}`}
            className="h-auto w-auto px-2 py-1 text-sm"
          >
            <SelectValue placeholder="Pilih karyawan…" />
          </SelectTrigger>
          <SelectContent>
            {pengguna.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="sm"
          disabled={sedangProses}
          className="px-3 text-sm"
        >
          {sedangProses ? "Menyimpan…" : "Hubungkan"}
        </Button>
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { labelPeriode } from "@/lib/rekap";

/** Filter Daftar Slip: periode gajian (28–27) + cabang. */
export function FilterSlip({
  periode,
  daftarPeriode,
  cabangId,
  cabang,
}: {
  periode: string;
  daftarPeriode: string[];
  cabangId: string;
  cabang: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function ubah(kunci: string, nilai: string) {
    const q = new URLSearchParams(params);
    if (nilai) q.set(kunci, nilai);
    else q.delete(kunci);
    router.push(`/admin/slip-gaji?${q}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
      <span className="inline-flex items-center gap-2">
        <Label htmlFor="periode-slip" className="text-xs font-normal text-muted">
          Periode
        </Label>
        <Select value={periode} onValueChange={(v) => ubah("periode", v)}>
          <SelectTrigger
            id="periode-slip"
            className="h-auto w-auto px-2.5 py-1.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {daftarPeriode.map((p) => (
              <SelectItem key={p} value={p}>
                {labelPeriode(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>

      {cabang.length > 1 ? (
        <span className="inline-flex items-center gap-2">
          <Label htmlFor="cabang-slip" className="text-xs font-normal text-muted">
            Cabang
          </Label>
          <Select
            value={cabangId || "semua"}
            onValueChange={(v) => ubah("cabang", v === "semua" ? "" : v)}
          >
            <SelectTrigger
              id="cabang-slip"
              className="h-auto w-auto px-2.5 py-1.5"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua cabang</SelectItem>
              {cabang.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      ) : null}
    </div>
  );
}

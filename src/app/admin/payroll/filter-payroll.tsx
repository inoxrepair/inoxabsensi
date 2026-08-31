"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { labelPeriode } from "@/lib/rekap";

export function FilterPayroll({
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
    router.push(`/admin/payroll?${q}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-3">
      <span className="inline-flex items-center gap-2">
        <label htmlFor="periode-payroll" className="text-xs text-muted">
          Periode
        </label>
        <select
          id="periode-payroll"
          value={periode}
          onChange={(e) => ubah("periode", e.target.value)}
          className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
        >
          {daftarPeriode.map((p) => (
            <option key={p} value={p}>
              {labelPeriode(p)}
            </option>
          ))}
        </select>
      </span>

      {cabang.length > 1 ? (
        <span className="inline-flex items-center gap-2">
          <label htmlFor="cabang-payroll" className="text-xs text-muted">
            Cabang
          </label>
          <select
            id="cabang-payroll"
            value={cabangId}
            onChange={(e) => ubah("cabang", e.target.value)}
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
          >
            <option value="">Semua cabang</option>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </span>
      ) : null}
    </div>
  );
}

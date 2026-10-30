"use client";

import { useTransition } from "react";
import { batalkanPengajuanIzin } from "@/app/admin/izin/actions";

export function BatalkanIzinButton({ id }: { id: string }) {
  const [sedang, mulai] = useTransition();
  return (
    <form
      action={(form) => {
        if (!confirm("Batalkan pengajuan izin ini?")) return;
        mulai(async () => {
          await batalkanPengajuanIzin(form);
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={sedang}
        className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-status-alpa disabled:opacity-40"
      >
        Batalkan
      </button>
    </form>
  );
}

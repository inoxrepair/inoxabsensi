"use client";

import { useTransition } from "react";
import { batalkanKasbon } from "@/app/admin/kasbon/actions";

export function BatalkanKasbonButton({ id }: { id: string }) {
  const [sedang, mulai] = useTransition();
  return (
    <form
      action={(form) => {
        if (!confirm("Batalkan pengajuan kasbon ini?")) return;
        mulai(async () => {
          await batalkanKasbon(form);
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

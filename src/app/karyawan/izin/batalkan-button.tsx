"use client";

import { useTransition } from "react";
import { batalkanPengajuanIzin } from "@/app/admin/izin/actions";
import { Button } from "@/components/ui/button";

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
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={sedang}
        className="h-6 px-2.5 text-status-alpa"
      >
        Batalkan
      </Button>
    </form>
  );
}

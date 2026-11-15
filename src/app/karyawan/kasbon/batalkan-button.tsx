"use client";

import { useTransition } from "react";
import { batalkanKasbon } from "@/app/admin/kasbon/actions";
import { Button } from "@/components/ui/button";

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

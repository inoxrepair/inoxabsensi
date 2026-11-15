"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prosesPengajuanIzin } from "./actions";

export function ProsesIzinButtons({ id }: { id: string }) {
  const [sedang, mulai] = useTransition();
  const [catatan, setCatatan] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);

  function kirim(status: "disetujui" | "ditolak") {
    const form = new FormData();
    form.set("id", id);
    form.set("status", status);
    form.set("catatanAdmin", catatan);
    mulai(async () => {
      const hasil = await prosesPengajuanIzin(form);
      setPesan(hasil.pesan);
    });
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        maxLength={300}
        placeholder="Catatan admin (opsional)"
        className="h-auto px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sedang}
          onClick={() => {
            if (!confirm("Setujui pengajuan ini? Hari dengan jadwal akan ditandai izin; hari tanpa jadwal dilewati.")) return;
            kirim("disetujui");
          }}
        >
          Setujui
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sedang}
          onClick={() => {
            if (!confirm("Tolak pengajuan ini?")) return;
            kirim("ditolak");
          }}
          className="text-muted"
        >
          Tolak
        </Button>
      </div>
      {pesan ? <p className="text-xs text-muted">{pesan}</p> : null}
    </div>
  );
}

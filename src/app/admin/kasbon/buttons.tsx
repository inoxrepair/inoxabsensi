"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catatBayarKasbon, prosesKasbon } from "./actions";

export function ProsesKasbonButtons({
  id,
  status,
  jumlah,
  jumlahTerbayar,
}: {
  id: string;
  status: string;
  jumlah: number;
  jumlahTerbayar: number;
}) {
  const [sedang, mulai] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  function kirim(form: FormData) {
    mulai(async () => {
      await prosesKasbon(form);
    });
  }

  if (status === "pending") {
    return (
      <form action={kirim} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <Button type="submit" name="status" value="disetujui" variant="outline" size="sm" disabled={sedang}>
          Setujui
        </Button>
        <Button type="submit" name="status" value="ditolak" variant="outline" size="sm" disabled={sedang} className="text-muted">
          Tolak
        </Button>
      </form>
    );
  }
  if (status === "disetujui") {
    const sisa = Math.max(0, jumlah - jumlahTerbayar);
    return (
      <div className="space-y-2">
        <form
          action={(form) => {
            mulai(async () => {
              const hasil = await catatBayarKasbon(form);
              setPesan(hasil.pesan);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <Input
            name="jumlahBayar"
            type="number"
            min={1}
            max={sisa}
            step={1}
            required
            placeholder="Jumlah bayar"
            className="h-auto w-28 px-2 py-1 text-xs tabular-nums"
          />
          <Button type="submit" variant="outline" size="sm" disabled={sedang || sisa === 0}>
            Catat bayar
          </Button>
        </form>
        <form action={kirim}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" name="status" value="lunas" variant="outline" size="sm" disabled={sedang}>
            Tandai lunas
          </Button>
        </form>
        {pesan ? <p className="text-xs text-muted">{pesan}</p> : null}
      </div>
    );
  }
  return null;
}

"use client";

import { useState, useTransition } from "react";
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
        <button type="submit" name="status" value="disetujui" disabled={sedang} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-40">
          Setujui
        </button>
        <button type="submit" name="status" value="ditolak" disabled={sedang} className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted disabled:opacity-40">
          Tolak
        </button>
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
          <input
            name="jumlahBayar"
            type="number"
            min={1}
            max={sisa}
            step={1}
            required
            placeholder="Jumlah bayar"
            className="w-28 rounded-lg border border-line px-2 py-1 text-xs tabular-nums"
          />
          <button type="submit" disabled={sedang || sisa === 0} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-40">
            Catat bayar
          </button>
        </form>
        <form action={kirim}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" name="status" value="lunas" disabled={sedang} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-40">
            Tandai lunas
          </button>
        </form>
        {pesan ? <p className="text-xs text-muted">{pesan}</p> : null}
      </div>
    );
  }
  return null;
}

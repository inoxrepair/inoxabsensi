"use client";

import { useTransition } from "react";
import { prosesKasbon } from "./actions";

export function ProsesKasbonButtons({ id, status }: { id: string; status: string }) {
  const [sedang, mulai] = useTransition();

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
    return (
      <form action={kirim}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" name="status" value="lunas" disabled={sedang} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium disabled:opacity-40">
          Tandai lunas
        </button>
      </form>
    );
  }
  return null;
}

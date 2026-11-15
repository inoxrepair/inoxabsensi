"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { INTERVAL_POLLING_CHAT_MS, type PesanChat } from "@/lib/chat";
import { AvatarApi } from "@/components/ui/avatar-api";
import { formatJamDetik } from "@/lib/waktu";

/** Inisial nama untuk avatar bila karyawan belum pasang foto profil. */
function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  const huruf = bagian.slice(0, 2).map((b) => b[0] ?? "");
  return huruf.join("").toUpperCase() || "?";
}

/**
 * Daftar pesan ruang bersama. Pesan baru dicek tiap 5 detik (polling via
 * router.refresh) dan tampilan digulir ke pesan terbaru. Pesan sendiri
 * rata kanan (gelap), pesan orang lain rata kiri dengan nama + jam.
 * Bubble baru masuk dengan animasi (kelas inox-pesan-masuk); di bawah
 * daftar tampil indikator "X sedang mengetik…" bila ada. Foto pengirim
 * yang sedang juara 1 Top 10 memakai cincin api.
 */
export function DaftarChat({
  pesan,
  sayaId,
  mengetik,
  juaraId,
}: {
  pesan: PesanChat[];
  sayaId: string;
  mengetik: string[];
  juaraId: string | null;
}) {
  const router = useRouter();
  const bawahRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), INTERVAL_POLLING_CHAT_MS);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan.length]);

  if (pesan.length === 0 && mengetik.length === 0) {
    return (
      <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6 text-center">
        <p className="text-sm font-medium">Belum ada pesan</p>
        <p className="mt-1 text-sm text-muted">
          Jadilah yang pertama menyapa di ruang ini.
        </p>
      </div>
    );
  }

  const teksMengetik =
    mengetik.length === 1
      ? `${mengetik[0]} sedang mengetik`
      : mengetik.length === 2
        ? `${mengetik[0]} dan ${mengetik[1]} sedang mengetik`
        : mengetik.length > 2
          ? `${mengetik[0]}, ${mengetik[1]} dan ${mengetik.length - 2} lainnya sedang mengetik`
          : "";

  return (
    <div className="space-y-3">
      {pesan.map((p) => {
        const saya = p.pengirimId === sayaId;
        const jam = formatJamDetik(new Date(p.dibuatPada)).slice(0, 5);
        return (
          <div
            key={p.id}
            className={`inox-pesan-masuk flex ${saya ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl ${
                saya
                  ? "rounded-br-md bg-ink text-paper"
                  : "rounded-bl-md border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60"
              }`}
            >
              {saya ? null : (
                <p className="flex items-center gap-1.5 text-xs">
                  {p.pengirimId === juaraId ? (
                    <AvatarApi foto={p.fotoProfil} nama={p.nama} />
                  ) : p.fotoProfil ? (
                    <img
                      src={p.fotoProfil}
                      alt=""
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-surface text-[10px] font-semibold">
                      {inisial(p.nama)}
                    </span>
                  )}
                  <span className="font-semibold">{p.nama}</span>
                  <span className="text-muted">{jam}</span>
                </p>
              )}
              {p.foto ? (
                <img
                  src={p.foto}
                  alt="Foto dari chat"
                  loading="lazy"
                  decoding="async"
                  className="mt-1.5 max-w-full rounded-xl"
                />
              ) : null}
              {p.suara ? (
                <audio
                  controls
                  preload="metadata"
                  src={p.suara}
                  className="mt-1.5 w-full min-w-52"
                />
              ) : null}
              {p.isi ? (
                <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                  {p.isi}
                </p>
              ) : null}
              {saya ? (
                <p className="mt-1 text-right text-[11px] text-paper/60">
                  {jam}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
      {teksMengetik ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="flex gap-1" aria-hidden="true">
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
          </span>
          <span>{teksMengetik}…</span>
        </div>
      ) : null}
      <div ref={bawahRef} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kompresFoto } from "@/lib/kompres-foto";
import {
  KUALITAS_FOTO_CHAT,
  MAKS_FOTO_CHAT_BYTE,
  MAKS_FOTO_CHAT_PX,
  MAKS_SUARA_CHAT_BYTE,
  MAKS_SUARA_CHAT_DETIK,
  INTERVAL_MENGETIK_MS,
} from "@/lib/chat";
import { kirimPesan, tandaiMengetikAksi, type HasilChat } from "./actions";

/** Format mp4 (AAC) bila didukung — paling mudah diputar di iPhone dan Android. */
function pilihTipeRekaman(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return undefined;
}

function formatDetik(detik: number): string {
  const m = Math.floor(detik / 60);
  const d = detik % 60;
  return `${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}

/**
 * Kirim pesan ke ruang bersama: teks, foto dari galeri HP, dan/atau voice
 * note. Foto dikompresi di browser dulu (maks. 1024 px, JPEG); voice note
 * direkam di browser (maks. 2 menit, berhenti otomatis). Setelah terkirim,
 * isian dikosongkan.
 */
export function FormChat() {
  const [isi, setIsi] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [suara, setSuara] = useState<Blob | null>(null);
  const [pratinjauSuara, setPratinjauSuara] = useState<string | null>(null);
  const [merekam, setMerekam] = useState(false);
  const [detik, setDetik] = useState(0);
  const [hasil, setHasil] = useState<HasilChat>(undefined);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const perekamRef = useRef<MediaRecorder | null>(null);
  const potonganRef = useRef<Blob[]>([]);
  const detikRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const buangRef = useRef(false);
  const pingTerakhirRef = useRef(0);

  // Berhenti merekam bila komponen dilepas (mis. pindah halaman).
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const p = perekamRef.current;
      if (p && p.state !== "inactive") p.stop();
    };
  }, []);

  /** Beri tahu ruang ini bahwa saya sedang mengetik (maks. tiap 3 detik). */
  function ketik(nilai: string) {
    setIsi(nilai);
    if (!nilai.trim()) return;
    const sekarang = Date.now();
    if (sekarang - pingTerakhirRef.current < INTERVAL_MENGETIK_MS) return;
    pingTerakhirRef.current = sekarang;
    void tandaiMengetikAksi();
  }

  async function pilihFoto(file: File | undefined) {
    if (!file) return;
    setHasil(undefined);
    try {
      const terkompresi = await kompresFoto(
        file,
        MAKS_FOTO_CHAT_PX,
        KUALITAS_FOTO_CHAT,
      );
      if (terkompresi.size > MAKS_FOTO_CHAT_BYTE) {
        setHasil({ ok: false, pesan: "Foto terlalu besar (maks. 2 MB)." });
        return;
      }
      setFoto(terkompresi);
      setPratinjau(URL.createObjectURL(terkompresi));
    } catch {
      setHasil({ ok: false, pesan: "Foto tidak bisa dibaca. Coba foto lain." });
    }
  }

  function batalFoto() {
    setFoto(null);
    setPratinjau(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function mulaiRekam() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setHasil({ ok: false, pesan: "Mikrofon tidak tersedia di perangkat ini." });
      return;
    }
    setHasil(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const perekam = new MediaRecorder(stream, {
        mimeType: pilihTipeRekaman(),
      });
      potonganRef.current = [];
      perekam.ondataavailable = (e) => {
        if (e.data.size > 0) potonganRef.current.push(e.data);
      };
      perekam.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (buangRef.current) {
          buangRef.current = false;
          return;
        }
        const blob = new Blob(potonganRef.current, {
          type: perekam.mimeType || "audio/mp4",
        });
        if (blob.size === 0) return;
        if (blob.size > MAKS_SUARA_CHAT_BYTE) {
          setHasil({ ok: false, pesan: "Voice note terlalu besar (maks. 2 MB)." });
          return;
        }
        setSuara(blob);
        setPratinjauSuara(URL.createObjectURL(blob));
      };
      perekam.start();
      perekamRef.current = perekam;
      detikRef.current = 0;
      setDetik(0);
      setMerekam(true);
      timerRef.current = window.setInterval(() => {
        detikRef.current += 1;
        setDetik(detikRef.current);
        if (detikRef.current >= MAKS_SUARA_CHAT_DETIK) berhentiRekam();
      }, 1000);
    } catch {
      setHasil({
        ok: false,
        pesan: "Mikrofon tidak diizinkan. Izinkan akses mikrofon lalu coba lagi.",
      });
    }
  }

  function berhentiRekam() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const perekam = perekamRef.current;
    perekamRef.current = null;
    setMerekam(false);
    if (perekam && perekam.state !== "inactive") perekam.stop();
  }

  function batalRekam() {
    buangRef.current = true;
    berhentiRekam();
  }

  function batalSuara() {
    setSuara(null);
    if (pratinjauSuara) URL.revokeObjectURL(pratinjauSuara);
    setPratinjauSuara(null);
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if ((!isi.trim() && !foto && !suara) || pending) return;
    setPending(true);
    setHasil(undefined);
    const data = new FormData();
    data.append("isi", isi);
    if (foto) data.append("foto", foto, "chat.jpg");
    if (suara) {
      data.append(
        "suara",
        suara,
        suara.type === "audio/mp4" ? "voice-note.m4a" : "voice-note.webm",
      );
    }
    try {
      const res = await kirimPesan(data);
      setHasil(res);
      if (res?.ok) {
        setIsi("");
        batalFoto();
        batalSuara();
      }
    } catch {
      // Server action gagal (mis. database tidak bisa dihubungi): jangan
      // biarkan tombol macet di "…" tanpa kabar — tampilkan error supaya
      // pengguna tahu pesannya belum terkirim.
      setHasil({ ok: false, pesan: "Pesan tidak terkirim. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={kirim}
      className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
    >
      {pratinjau ? (
        <div className="relative mb-2 inline-block">
          <img
            src={pratinjau}
            alt="Pratinjau foto"
            className="max-h-32 rounded-xl"
          />
          <Button
            type="button"
            onClick={batalFoto}
            aria-label="Batalkan foto"
            className="absolute -right-2 -top-2 size-6 rounded-full px-0 text-sm"
          >
            ×
          </Button>
        </div>
      ) : null}

      {pratinjauSuara ? (
        <div className="mb-2 flex items-center gap-2">
          <audio controls preload="metadata" src={pratinjauSuara} className="min-w-0 flex-1" />
          <Button
            type="button"
            onClick={batalSuara}
            aria-label="Batalkan voice note"
            className="size-6 shrink-0 rounded-full px-0 text-sm"
          >
            ×
          </Button>
        </div>
      ) : null}

      {merekam ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 animate-pulse rounded-full bg-status-alpa"
          />
          <span className="text-sm font-medium tabular-nums">
            Merekam {formatDetik(detik)} / {formatDetik(MAKS_SUARA_CHAT_DETIK)}
          </span>
          <Button
            type="button"
            onClick={berhentiRekam}
            className="ml-auto shrink-0 rounded-full"
          >
            Berhenti
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={batalRekam}
            className="shrink-0 rounded-full"
          >
            Batal
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void mulaiRekam()}
            disabled={pending}
            aria-label="Rekam voice note"
            className="size-10 shrink-0 rounded-full [&_svg]:size-5"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <path d="M12 19v3" />
              <path d="M8 23h8" />
            </svg>
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-10 shrink-0 cursor-pointer rounded-full [&_svg]:size-5"
          >
            <label aria-label="Pilih foto dari galeri">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="1.8" />
                <path d="M4.5 18l4.5-4.5 3 3L16.5 12l3 3" />
              </svg>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                aria-label="Pilih foto"
                onChange={(e) => void pilihFoto(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </Button>

          <Input
            value={isi}
            onChange={(e) => ketik(e.target.value)}
            maxLength={1000}
            placeholder="Tulis pesan…"
            aria-label="Tulis pesan"
            className="min-w-0 flex-1 rounded-full bg-paper px-3.5 py-2.5"
          />

          <Button
            type="submit"
            disabled={pending || (!isi.trim() && !foto && !suara)}
            className="shrink-0 rounded-full"
          >
            {pending ? "…" : "Kirim"}
          </Button>
        </div>
      )}

      {hasil && !hasil.ok ? (
        <p role="status" className="mt-2 text-sm text-status-alpa">
          {hasil.pesan}
        </p>
      ) : null}
    </form>
  );
}

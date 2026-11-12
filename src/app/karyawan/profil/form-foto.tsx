"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hapusFotoProfil,
  simpanFotoProfil,
  type HasilFoto,
} from "./actions";

/**
 * Upload foto profil dari HP. Foto dikompresi di browser dulu (maks. 512 px,
 * JPEG) supaya foto dari kamera HP yang aslinya bermega-mega tidak membebani
 * database dan lolos batas 2 MB di server.
 */
async function kompresFoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const gambar = new Image();
    await new Promise<void>((selesai, gagal) => {
      gambar.onload = () => selesai();
      gambar.onerror = () => gagal(new Error("gagal memuat gambar"));
      gambar.src = url;
    });
    const sisi = Math.max(gambar.width, gambar.height);
    const skala = sisi > 512 ? 512 / sisi : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(gambar.width * skala);
    canvas.height = Math.round(gambar.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(gambar, 0, 0, canvas.width, canvas.height);
    const hasil = await new Promise<Blob | null>((selesai) =>
      canvas.toBlob(selesai, "image/jpeg", 0.82),
    );
    return hasil ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FormFoto() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<Blob | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilFoto>(undefined);
  const [pending, setPending] = useState(false);

  async function pilihFoto(file: File | undefined) {
    if (!file) return;
    setHasil(undefined);
    try {
      const terkompresi = await kompresFoto(file);
      if (terkompresi.size > 2_000_000) {
        setHasil({ ok: false, pesan: "Foto terlalu besar (maks. 2 MB)." });
        return;
      }
      setBerkas(terkompresi);
      setPratinjau(URL.createObjectURL(terkompresi));
    } catch {
      setHasil({ ok: false, pesan: "Foto tidak bisa dibaca. Coba foto lain." });
    }
  }

  async function simpan() {
    if (!berkas) {
      setHasil({ ok: false, pesan: "Pilih foto dulu." });
      return;
    }
    setPending(true);
    const data = new FormData();
    data.append("foto", berkas, "foto-profil.jpg");
    const res = await simpanFotoProfil(data);
    setHasil(res);
    setPending(false);
    if (res?.ok) router.refresh();
  }

  async function hapus() {
    setPending(true);
    const res = await hapusFotoProfil();
    setHasil(res);
    setBerkas(null);
    setPratinjau(null);
    if (inputRef.current) inputRef.current.value = "";
    setPending(false);
    if (res?.ok) router.refresh();
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <p className="text-sm font-semibold">Foto profil</p>
      <p className="mt-1 text-xs text-muted">
        Pilih foto dari galeri HP, lalu simpan. Foto lama akan kembali ke
        inisial nama kalau dihapus.
      </p>

      {pratinjau ? (
        <img
          src={pratinjau}
          alt="Pratinjau foto profil"
          className="mt-3 size-20 rounded-full object-cover"
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Pilih foto profil"
        onChange={(e) => void pilihFoto(e.target.files?.[0])}
        className="mt-3 w-full text-sm"
      />

      {hasil ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={pending || !berkas}
          className="flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          {pending ? "Menyimpan…" : "Simpan foto"}
        </button>
        <button
          type="button"
          onClick={() => void hapus()}
          disabled={pending}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Hapus foto
        </button>
      </div>
    </div>
  );
}

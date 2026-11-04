"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hapusLogoAplikasi,
  simpanLogoAplikasi,
  type HasilLogo,
} from "./logo-actions";

/**
 * Form ganti logo aplikasi di Pengaturan. Gambar raster dikompresi di browser
 * (maks. 1024 px, format asli dipertahankan supaya PNG transparan tetap
 * transparan); SVG dilewatkan apa adanya karena sudah vektor.
 */
async function kompresLogo(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;
  const url = URL.createObjectURL(file);
  try {
    const gambar = new Image();
    await new Promise<void>((selesai, gagal) => {
      gambar.onload = () => selesai();
      gambar.onerror = () => gagal(new Error("gagal memuat gambar"));
      gambar.src = url;
    });
    const sisi = Math.max(gambar.width, gambar.height);
    const skala = sisi > 1024 ? 1024 / sisi : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(gambar.width * skala);
    canvas.height = Math.round(gambar.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(gambar, 0, 0, canvas.width, canvas.height);
    const hasil = await new Promise<Blob | null>((selesai) =>
      canvas.toBlob(selesai, file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9),
    );
    return hasil ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FormLogo({ adaLogoKustom }: { adaLogoKustom: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<Blob | null>(null);
  const [namaBerkas, setNamaBerkas] = useState<string | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilLogo>(undefined);
  const [pending, setPending] = useState(false);

  async function pilihLogo(file: File | undefined) {
    if (!file) return;
    setHasil(undefined);
    try {
      const terkompresi = await kompresLogo(file);
      if (terkompresi.size > 2_000_000) {
        setHasil({ ok: false, pesan: "Logo terlalu besar (maks. 2 MB)." });
        return;
      }
      setBerkas(terkompresi);
      setNamaBerkas(file.name);
      setPratinjau(URL.createObjectURL(terkompresi));
    } catch {
      setHasil({ ok: false, pesan: "Gambar tidak bisa dibaca. Coba gambar lain." });
    }
  }

  async function simpan() {
    if (!berkas) {
      setHasil({ ok: false, pesan: "Pilih gambar logo dulu." });
      return;
    }
    setPending(true);
    const data = new FormData();
    data.append("logo", berkas, namaBerkas ?? "logo.png");
    const res = await simpanLogoAplikasi(data);
    setHasil(res);
    setPending(false);
    if (res?.ok) router.refresh();
  }

  async function hapus() {
    setPending(true);
    const res = await hapusLogoAplikasi();
    setHasil(res);
    setBerkas(null);
    setNamaBerkas(null);
    setPratinjau(null);
    if (inputRef.current) inputRef.current.value = "";
    setPending(false);
    if (res?.ok) router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Logo ini tampil di halaman login, beranda, dan header admin untuk semua
        cabang. {adaLogoKustom ? "Saat ini memakai logo kustom." : "Saat ini memakai logo iNOX bawaan."}
      </p>

      {pratinjau ? (
        <img
          src={pratinjau}
          alt="Pratinjau logo aplikasi"
          className="mt-3 h-16 w-auto max-w-full object-contain"
        />
      ) : (
        <img
          src="/api/logo"
          alt="Logo aplikasi saat ini"
          className="mt-3 h-16 w-auto max-w-full object-contain"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        aria-label="Pilih gambar logo aplikasi"
        onChange={(e) => void pilihLogo(e.target.files?.[0])}
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
          {pending ? "Menyimpan…" : "Simpan logo"}
        </button>
        <button
          type="button"
          onClick={() => void hapus()}
          disabled={pending}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Kembalikan bawaan
        </button>
      </div>
    </div>
  );
}

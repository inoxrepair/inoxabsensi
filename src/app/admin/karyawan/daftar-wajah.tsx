"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  beberapaDescriptor,
  bukaKamera,
  stopKamera,
} from "@/lib/face-client";
import { rataEmbedding } from "@/lib/wajah";
import { simpanWajah, hapusWajah, type HasilWajah } from "./aksi-wajah";

const JUMLAH_SAMPEL = 3;

/**
 * Pendaftaran wajah karyawan. Mengambil beberapa sampel dari kamera,
 * merata-ratakannya di klien, lalu mengirim satu vektor ke server. Foto tidak
 * pernah dikirim maupun disimpan.
 */
export function DaftarWajah({
  userId,
  nama,
  sudahDaftar,
  tanggalDaftar,
  onSelesai,
}: {
  userId: string;
  nama: string;
  sudahDaftar: boolean;
  tanggalDaftar: string | null;
  onSelesai: (h: HasilWajah) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aktif, setAktif] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, mulaiTransisi] = useTransition();
  const [sibuk, setSibuk] = useState(false);

  // Kamera harus selalu dimatikan saat dialog ditutup atau komponen lepas.
  useEffect(() => {
    return () => stopKamera(videoRef.current);
  }, []);

  async function mulai() {
    setGalat(null);
    setStatus("Memuat model wajah…");
    const video = videoRef.current;
    if (!video) return;

    const kamera = await bukaKamera(video);
    if (!kamera.ok) {
      setGalat(kamera.pesan);
      setStatus(null);
      return;
    }
    setAktif(true);
    setStatus("Arahkan wajah ke kamera, lalu tekan Ambil Sampel.");
  }

  async function ambilSampel() {
    const video = videoRef.current;
    if (!video || sibuk) return;
    setSibuk(true);
    setGalat(null);
    setStatus(`Mengambil ${JUMLAH_SAMPEL} sampel wajah…`);

    try {
      const hasil = await beberapaDescriptor(video, JUMLAH_SAMPEL);
      if (!hasil.ok) {
        setGalat(hasil.pesan);
        setStatus(null);
        setSibuk(false);
        return;
      }

      const rata = rataEmbedding(hasil.sampel);
      if (!rata) {
        setGalat("Sampel wajah tidak valid. Coba lagi.");
        setStatus(null);
        setSibuk(false);
        return;
      }

      setStatus(`Menyimpan data wajah (${hasil.sampel.length}/${JUMLAH_SAMPEL} sampel)…`);
      mulaiTransisi(async () => {
        const simpan = await simpanWajah(userId, rata);
        stopKamera(video);
        setSibuk(false);
        onSelesai(simpan);
      });
    } catch {
      setGalat("Gagal memproses wajah. Muat ulang halaman lalu coba lagi.");
      setStatus(null);
      setSibuk(false);
    }
  }

  function tutup() {
    stopKamera(videoRef.current);
    setAktif(false);
    setStatus(null);
    onSelesai({ ok: true, pesan: "" });
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="daftar-wajah-judul">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-xl">
        <h2 id="daftar-wajah-judul" className="font-semibold">
          Daftarkan wajah: {nama}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Yang disimpan hanya kode matematis wajah (128 angka), bukan foto.
          {sudahDaftar && tanggalDaftar
            ? ` Sudah terdaftar pada ${tanggalDaftar}.`
            : ""}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`aspect-[4/3] w-full object-cover ${aktif ? "" : "hidden"}`}
          />
          {!aktif ? (
            <div className="grid aspect-[4/3] place-items-center text-sm text-muted">
              Kamera belum aktif
            </div>
          ) : null}
        </div>

        {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
        {galat ? (
          <p role="alert" className="mt-3 rounded-xl bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
            {galat}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {!aktif ? (
            <button
              type="button"
              onClick={mulai}
              className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper"
            >
              Aktifkan Kamera
            </button>
          ) : (
            <button
              type="button"
              onClick={ambilSampel}
              disabled={sibuk || mengirim}
              className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-40"
            >
              {sibuk || mengirim ? "Memproses…" : "Ambil Sampel Wajah"}
            </button>
          )}
          {sudahDaftar && !aktif ? (
            <button
              type="button"
              onClick={() =>
                mulaiTransisi(async () => onSelesai(await hapusWajah(userId)))
              }
              disabled={mengirim}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              Hapus Data Wajah
            </button>
          ) : null}
          <button
            type="button"
            onClick={tutup}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
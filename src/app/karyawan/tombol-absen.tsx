"use client";

import { useState, useTransition } from "react";
import { AnimasiCheck } from "@/components/ui/animasi-check";
import { absenKeluar, absenMasuk, type HasilAbsen } from "./actions";
import {
  bunyiCheck,
  bunyiGagal,
  DURASI_ANIMASI_MS,
  siapkanAudio,
} from "@/lib/suara";

type Mode = "masuk" | "keluar" | "selesai";

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari tidak selalu mengekspos isSecureContext di localhost/IP LAN.
  // Protokol https dan localhost dianggap aman; http://IP LAN tidak.
  const { protocol, hostname } = window.location;
  return (
    protocol === "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

/**
 * Tombol absen mengambil koordinat via Geolocation API lalu mengirimkannya
 * ke server action. Validasi radius tetap dilakukan di server; nilai di
 * klien hanya untuk umpan balik cepat.
 */
export function TombolAbsen({
  mode,
  cycleKe,
  maksimalCycle,
  mulaiMenit,
}: {
  mode: Mode;
  cycleKe: number;
  maksimalCycle: number;
  mulaiMenit: number | null;
}) {
  const [hasil, setHasil] = useState<HasilAbsen | null>(null);
  const [mengambilLokasi, setMengambilLokasi] = useState(false);
  const [mengirim, mulaiTransisi] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [animasi, setAnimasi] = useState<{ judul: string } | null>(null);

  const sibuk = mengambilLokasi || mengirim || animasi !== null;

  if (mode === "selesai") {
    return (
      <>
        <div className="mt-5 rounded-2xl border border-line bg-paper px-6 py-6 text-center">
          <p className="font-medium">Absensi hari ini selesai</p>
          <p className="mt-1 text-sm text-muted">
            Terima kasih, tidak ada tindakan lain yang diperlukan.
          </p>
        </div>
        <Pesan hasil={hasil} />
      </>
    );
  }

  function kirimAbsen(coords: GeolocationCoordinates) {
    const data = new FormData();
    data.set("lat", String(coords.latitude));
    data.set("lng", String(coords.longitude));

    mulaiTransisi(async () => {
      const aksi = mode === "masuk" ? absenMasuk : absenKeluar;
      const jawaban = await aksi(data);
      setHasil(jawaban);

      if (jawaban.ok) {
        bunyiCheck();
        setAnimasi({
          judul: mode === "masuk" ? "Absen masuk tercatat" : "Absen keluar tercatat",
        });
        window.setTimeout(() => setAnimasi(null), DURASI_ANIMASI_MS);
      } else {
        bunyiGagal();
      }
    });
  }

  function jalankan() {
    setHasil(null);

    // iOS Safari & beberapa browser Android menolak geolocation di HTTP
    // non-localhost. Beri pesan spesifik supaya admin tahu harus pakai HTTPS.
    if (!navigator.geolocation) {
      setHasil({
        ok: false,
        pesan:
          "Browser tidak mendukung deteksi lokasi. Gunakan browser modern (Safari/Chrome).",
      });
      return;
    }

    if (!isSecureContext()) {
      setHasil({
        ok: false,
        pesan:
          "Akses lokasi hanya tersedia lewat HTTPS atau localhost. Buka aplikasi dari alamat yang aman.",
      });
      return;
    }

    setMengambilLokasi(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMengambilLokasi(false);
        kirimAbsen(coords);
      },
      (galat) => {
        setMengambilLokasi(false);
        let pesan: string;
        switch (galat.code) {
          case galat.PERMISSION_DENIED:
            pesan =
              "Izin lokasi ditolak. Di iOS: Pengaturan > Safari > Lokasi > Izinkan. Di Android: aktifkan GPS dan izinkan browser.";
            break;
          case galat.POSITION_UNAVAILABLE:
            pesan =
              "Posisi tidak tersedia. Pastikan GPS aktif dan coba di area terbuka.";
            break;
          case galat.TIMEOUT:
            pesan =
              "Waktu deteksi habis. Coba lagi atau pindah ke area dengan sinyal GPS lebih baik.";
            break;
          default:
            pesan = "Lokasi tidak terdeteksi. Coba lagi di area terbuka.";
        }
        setHasil({ ok: false, pesan });
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  }

  function bukaKonfirmasi() {
    // Sentuhan pertama membuka kunci audio di iOS Safari supaya bunyi
    // "check" bisa berbunyi saat absen selesai.
    siapkanAudio();
    if (!sibuk) setKonfirmasi(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={bukaKonfirmasi}
        disabled={sibuk}
        className="mt-5 w-full rounded-2xl bg-ink px-6 py-6 text-lg font-semibold text-paper disabled:opacity-40"
      >
        {mengambilLokasi
          ? "Mendeteksi lokasi…"
          : mengirim
            ? "Menyimpan…"
            : mode === "masuk"
              ? cycleKe > 1 ? `Absen Masuk Cycle ${cycleKe}` : "Absen Masuk"
              : "Absen Keluar"}
      </button>
      {konfirmasi ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="konfirmasi-absen">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-xl">
            <h2 id="konfirmasi-absen" className="font-semibold">
              {mode === "keluar" ? `Akhiri Cycle ${cycleKe - 1}?` : `Mulai Cycle ${cycleKe} dari maksimal ${maksimalCycle}?`}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {mode === "keluar" && mulaiMenit != null
                ? `Cycle dimulai pukul ${String(Math.floor(mulaiMenit / 60)).padStart(2, "0")}.${String(mulaiMenit % 60).padStart(2, "0")}. Waktu keluar menggunakan waktu server.`
                : "Lokasi akan diverifikasi dan waktu absensi menggunakan waktu server."}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setKonfirmasi(false)} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-medium">Batal</button>
              <button type="button" onClick={() => { setKonfirmasi(false); jalankan(); }} className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper">
                {mode === "keluar" ? "Ya, Absen Keluar" : "Ya, Absen Masuk"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {animasi ? <AnimasiCheck judul={animasi.judul} /> : null}
      <Pesan hasil={hasil} />
    </>
  );
}

function Pesan({ hasil }: { hasil: HasilAbsen | null }) {
  if (!hasil) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm ${
        hasil.ok
          ? "bg-status-hadir/10 text-status-hadir"
          : "bg-status-alpa/10 text-status-alpa"
      }`}
    >
      {hasil.pesan}
    </p>
  );
}

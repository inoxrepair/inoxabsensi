"use client";

import { useState, useTransition } from "react";
import { absenKeluar, absenMasuk, type HasilAbsen } from "./actions";

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
export function TombolAbsen({ mode }: { mode: Mode }) {
  const [hasil, setHasil] = useState<HasilAbsen | null>(null);
  const [mengambilLokasi, setMengambilLokasi] = useState(false);
  const [mengirim, mulaiTransisi] = useTransition();

  const sibuk = mengambilLokasi || mengirim;

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
        const data = new FormData();
        data.set("lat", String(coords.latitude));
        data.set("lng", String(coords.longitude));

        mulaiTransisi(async () => {
          const aksi = mode === "masuk" ? absenMasuk : absenKeluar;
          setHasil(await aksi(data));
        });
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

  return (
    <>
      <button
        type="button"
        onClick={jalankan}
        disabled={sibuk}
        className="mt-5 w-full rounded-2xl bg-ink px-6 py-6 text-lg font-semibold text-paper disabled:opacity-40"
      >
        {mengambilLokasi
          ? "Mendeteksi lokasi…"
          : mengirim
            ? "Menyimpan…"
            : mode === "masuk"
              ? "Absen Masuk"
              : "Absen Keluar"}
      </button>
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

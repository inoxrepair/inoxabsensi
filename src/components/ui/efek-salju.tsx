"use client";

import { useEffect, useRef } from "react";

/**
 * Efek salju musim dingin — ambience minimalis di halaman absen saja.
 *
 * Satu canvas `fixed` di atas latar aurora (z-20, di bawah dialog dan
 * drawer) dengan `pointer-events: none`, jadi tidak mengganggu klik atau
 * isi halaman. Kepingan sedikit (±22–45 menyesuaikan layar), kecil, dan
 * jatuh pelan supaya nuansa winter terasa tanpa mengganggu. Kepingan yang
 * cukup besar digambar sebagai kristal salju (bintang 6 lengan), yang
 * kecil tetap bulat. Animasi dibatasi ~30 fps dan DPR maks. 1.5 supaya
 * tidak frame drop di HP.
 *
 * Menghormati `prefers-reduced-motion` (hanya gambar diam, tanpa animasi)
 * dan berhenti saat tab tidak terlihat (hemat baterai HP).
 *
 * Ukuran canvas dibaca dari `window.visualViewport` (bila ada), BUKAN dari
 * `window.innerWidth/innerHeight` saja. Alasannya: saat pengguna pinch-zoom
 * di HP, `window` tidak selalu memicu `resize` ketika zoom dikembalikan
 * (zoom-out), sehingga canvas tertinggal di ukuran saat zoom-in. Event
 * `resize`/`scroll` pada `visualViewport` selalu menyala saat zoom berubah,
 * jadi canvas selalu mengikuti area layar yang terlihat saat itu.
 */

type Keping = {
  x: number;
  y: number;
  /** Jari-jari px. */
  r: number;
  /** Kecepatan jatuh px per detik. */
  jatuh: number;
  /** Amplitudo goyangan horizontal px. */
  goyang: number;
  /** Fase ayunan sinus. */
  fase: number;
  /** Detik per satu ayunan. */
  periode: number;
  opasitas: number;
  /** True = digambar sebagai kristal salju 6 lengan, false = bulat. */
  kristal: boolean;
};

function acak(min: number, maks: number) {
  return min + Math.random() * (maks - min);
}

function buatKeping(lebar: number, tinggi: number): Keping[] {
  // Lebih sedikit di HP (layar kecil): 22–45 keping cukup memberi nuansa
  // tanpa membebani GPU — canvas digambar ulang tiap frame, jadi jumlah
  // keping dan ukuran pikselnya langsung terasa di frame rate.
  const jumlah = Math.round(
    Math.min(45, Math.max(22, (lebar * tinggi) / 22000)),
  );
  const daftar: Keping[] = [];
  for (let i = 0; i < jumlah; i++) {
    // Beberapa keping pertama besar & samar — memberi kedalaman.
    const besar = i < 5;
    const r = besar ? acak(4, 6) : acak(1, 3.2);
    daftar.push({
      x: acak(0, lebar),
      y: acak(0, tinggi),
      r,
      jatuh: besar ? acak(10, 18) : acak(14, 32),
      goyang: acak(8, 24),
      fase: acak(0, Math.PI * 2),
      periode: acak(3, 7),
      opasitas: besar ? acak(0.12, 0.2) : acak(0.3, 0.75),
      // Kepingan besar selalu kristal; yang kecil jadi kristal bila
      // cukup besar untuk terbaca bentuknya (r >= 2,6).
      kristal: r >= 2.6,
    });
  }
  return daftar;
}

export function EfekSalju() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const kanvas = ref.current;
    if (!kanvas) return;
    const ctx = kanvas.getContext("2d");
    if (!ctx) return;

    // DPR dibatasi 1.5: di HP retina (DPR 2–3) piksel yang digambar tiap
    // frame turun ~44% dibanding DPR 2, dengan beda visual yang nyaris
    // tidak terlihat untuk kepingan sekecil ini.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let lebar = 0;
    let tinggi = 0;
    let keping: Keping[] = [];
    let raf = 0;
    let terakhir = 0;
    let waktu = 0;
    const gerakKurangi = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ukur = () => {
      // Area layar yang terlihat saat itu (ikut berubah saat pinch-zoom).
      const vp = window.visualViewport;
      const lebarBaru = Math.round(vp ? vp.width : window.innerWidth);
      const tinggiBaru = Math.round(vp ? vp.height : window.innerHeight);
      // Bila ukuran tidak berubah (mis. hanya geser saat zoom), jangan
      // acak ulang kepingan — cukup biarkan animasi berjalan.
      if (lebarBaru === lebar && tinggiBaru === tinggi) return;
      lebar = lebarBaru;
      tinggi = tinggiBaru;
      kanvas.width = Math.round(lebar * dpr);
      kanvas.height = Math.round(tinggi * dpr);
      kanvas.style.width = `${lebar}px`;
      kanvas.style.height = `${tinggi}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      keping = buatKeping(lebar, tinggi);
    }

    const gambar = () => {
      ctx.clearRect(0, 0, lebar, tinggi);
      for (const k of keping) {
        const x =
          k.x +
          Math.sin((waktu / k.periode) * Math.PI * 2 + k.fase) * k.goyang;
        if (k.kristal) {
          // Kristal salju: 3 garis bersilangan 60 derajat (6 lengan).
          ctx.strokeStyle = `rgba(255, 255, 255, ${k.opasitas})`;
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          for (let a = 0; a < 3; a++) {
            const sudut = (a * Math.PI) / 3;
            const dx = Math.cos(sudut) * k.r;
            const dy = Math.sin(sudut) * k.r;
            ctx.beginPath();
            ctx.moveTo(x - dx, k.y - dy);
            ctx.lineTo(x + dx, k.y + dy);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(x, k.y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${k.opasitas})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, k.y, k.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${k.opasitas})`;
          ctx.fill();
        }
      }
    }

    // Dibatasi ~30 fps: salju yang jatuh pelan tidak butuh 60 fps, dan
    // menggambar canvas layar penuh tiap frame adalah penyebab utama
    // frame drop di halaman absen. Frame yang datang lebih cepat dari
    // 33 ms dilewati saja (tanpa menggambar ulang).
    const langkah = (stempel: number) => {
      const berlalu = stempel - terakhir;
      if (berlalu < 33) {
        raf = requestAnimationFrame(langkah);
        return;
      }
      const dt = Math.min(0.05, berlalu / 1000 || 0);
      terakhir = stempel;
      waktu += dt;
      for (const k of keping) {
        k.y += k.jatuh * dt;
        if (k.y - k.r > tinggi) {
          k.y = -k.r;
          k.x = acak(0, lebar);
        }
      }
      gambar();
      raf = requestAnimationFrame(langkah);
    }

    const mulai = () => {
      if (gerakKurangi) {
        gambar(); // sekali saja, diam
        return;
      }
      if (document.hidden) return;
      terakhir = performance.now();
      raf = requestAnimationFrame(langkah);
    }

    const berhenti = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    const saatTerlihat = () => {
      if (document.hidden) berhenti();
      else if (!gerakKurangi) mulai();
    }

    ukur();
    mulai();
    window.addEventListener("resize", ukur);
    document.addEventListener("visibilitychange", saatTerlihat);
    const vp = window.visualViewport;
    vp?.addEventListener("resize", ukur);
    vp?.addEventListener("scroll", ukur);
    return () => {
      berhenti();
      window.removeEventListener("resize", ukur);
      document.removeEventListener("visibilitychange", saatTerlihat);
      vp?.removeEventListener("resize", ukur);
      vp?.removeEventListener("scroll", ukur);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20"
    />
  );
}

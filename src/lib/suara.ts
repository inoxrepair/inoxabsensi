"use client";

/**
 * Suara notifikasi dibangkitkan dengan Web Audio API, bukan file audio.
 * Dengan begitu tidak ada aset yang perlu diunduh dan tidak ada beban server.
 * Nada pendek dua langkah meniru bunyi "check" mesin absensi.
 */

let konteks: AudioContext | null = null;

type JenisAudioContext = typeof AudioContext;

function ambilKonteks(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: JenisAudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: JenisAudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!konteks) konteks = new Ctor();
  // Browser menangguhkan audio sampai ada interaksi pengguna.
  if (konteks.state === "suspended") void konteks.resume();
  return konteks;
}

/** Satu nada pendek dengan amplop agar tidak berbunyi "kletuk". */
function nada(
  ctx: AudioContext,
  frekuensi: number,
  mulaiDetik: number,
  durasiDetik: number,
  volume: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frekuensi;

  const mulai = ctx.currentTime + mulaiDetik;
  const akhir = mulai + durasiDetik;
  // Naik cepat lalu meluruh; lebih enak didengar daripada potongan tajam.
  gain.gain.setValueAtTime(0, mulai);
  gain.gain.linearRampToValueAtTime(volume, mulai + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, akhir);

  osc.connect(gain).connect(ctx.destination);
  osc.start(mulai);
  osc.stop(akhir + 0.02);
}

/** Bunyi "check" untuk absen masuk dan keluar yang berhasil. */
export function bunyiCheck(): void {
  const ctx = ambilKonteks();
  if (!ctx) return;
  nada(ctx, 880, 0, 0.12, 0.18);
  nada(ctx, 1320, 0.1, 0.18, 0.16);
}

/** Bunyi lebih rendah saat verifikasi gagal atau ditolak. */
export function bunyiGagal(): void {
  const ctx = ambilKonteks();
  if (!ctx) return;
  nada(ctx, 320, 0, 0.18, 0.16);
  nada(ctx, 220, 0.14, 0.24, 0.14);
}

/**
 * Buka kunci audio pada interaksi pertama. iOS Safari tidak mengizinkan
 * audio sebelum ada sentuhan pengguna, jadi dipanggil dari tombol absen.
 */
export function siapkanAudio(): void {
  ambilKonteks();
}

/** Durasi animasi centang, sejalan dengan keyframes di globals.css. */
export const DURASI_ANIMASI_MS = 1000;
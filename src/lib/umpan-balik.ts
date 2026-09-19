"use client";

/**
 * Umpan balik visual dan suara untuk absensi. Semuanya berjalan di perangkat
 * (Web Audio + CSS), jadi tidak menambah beban server maupun permintaan
 * jaringan. Tidak ada file audio yang perlu diunduh.
 */

/**
 * Bunyikan nada "check" singkat: dua nada naik (seperti notifikasi berhasil).
 * Dibuat dengan oscillator sehingga tidak perlu aset audio.
 */
export function bunyiCheck(): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const sekarang = ctx.currentTime;

    // Dua nada singkat: 880 Hz lalu 1320 Hz sebagai "ting".
    const nada: { freq: number; mulai: number; durasi: number }[] = [
      { freq: 880, mulai: 0, durasi: 0.1 },
      { freq: 1320, mulai: 0.09, durasi: 0.16 },
    ];

    for (const n of nada) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;

      // Envelope singkat supaya tidak ada bunyi klik di awal/akhir.
      const t0 = sekarang + n.mulai;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.durasi);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.durasi + 0.02);
    }

    // Tutup konteks setelah nada selesai agar tidak menahan audio device.
    window.setTimeout(() => void ctx.close().catch(() => {}), 600);
  } catch {
    // Bunyi gagal tidak boleh mengganggu absensi.
  }
}

/** Durasi animasi dan jeda agar pengenalan wajah tidak terasa terlalu cepat. */
export const DURASI_ANIMASI_MS = 1000;
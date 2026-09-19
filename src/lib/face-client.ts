"use client";

/**
 * Sisi klien face recognition. Semua pemrosesan gambar terjadi di perangkat
 * karyawan; yang dikirim ke server hanya vektor 128 angka, bukan foto.
 *
 * Model disajikan dari /models agar tidak bergantung layanan luar. Backend
 * default face-api adalah WebGL sehingga tidak butuh file WASM tambahan.
 */

type FaceApi = typeof import("@vladmandic/face-api");

let modul: Promise<FaceApi> | null = null;

/** Muat library dan model sekali saja, lalu simpan hasilnya. */
export function siapkanWajah(): Promise<FaceApi> {
  if (!modul) {
    modul = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    })().catch((error) => {
      // Reset cache supaya percobaan berikutnya bisa memuat ulang model.
      modul = null;
      throw error;
    });
  }
  return modul;
}

/** Opsi deteksi: input kecil supaya cukup cepat di ponsel kelas menengah. */
const OPSI_DETEKSI = { inputSize: 320, scoreThreshold: 0.5 };

export type HasilDescriptor =
  | { ok: true; embedding: number[]; skor: number }
  | { ok: false; pesan: string };

/**
 * Ambil descriptor wajah tunggal dari sebuah elemen video/gambar.
 * Gagal bila tidak ada wajah, ada lebih dari satu, atau gambar terlalu buram.
 */
export async function descriptorDariMedia(
  media: HTMLVideoElement | HTMLImageElement,
): Promise<HasilDescriptor> {
  // Video yang belum mengalir akan menghasilkan deteksi kosong; tunggu dulu.
  if (media instanceof HTMLVideoElement && media.readyState < 2) {
    return { ok: false, pesan: "Kamera belum siap. Tunggu sesaat lalu coba lagi." };
  }

  const faceapi = await siapkanWajah();

  const deteksi = await faceapi
    .detectAllFaces(
      media,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: OPSI_DETEKSI.inputSize,
        scoreThreshold: OPSI_DETEKSI.scoreThreshold,
      }),
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (deteksi.length === 0) {
    return { ok: false, pesan: "Wajah tidak terdeteksi. Dekatkan wajah dan pastikan cahaya cukup." };
  }
  if (deteksi.length > 1) {
    return { ok: false, pesan: "Terdeteksi lebih dari satu wajah. Pastikan hanya Anda di depan kamera." };
  }

  return {
    ok: true,
    embedding: Array.from(deteksi[0].descriptor),
    skor: deteksi[0].detection.score,
  };
}

export type HasilSampel =
  | { ok: true; sampel: number[][] }
  | { ok: false; pesan: string };

/** Ambil beberapa sampel berurutan; berguna saat pendaftaran wajah admin. */
export async function beberapaDescriptor(
  media: HTMLVideoElement,
  jumlah: number,
): Promise<HasilSampel> {
  const sampel: number[][] = [];
  let percobaan = 0;

  // Beri jeda kecil antar sampel supaya model menangkap variasi mikro.
  while (sampel.length < jumlah && percobaan < jumlah * 4) {
    percobaan += 1;
    const hasil = await descriptorDariMedia(media);
    if (hasil.ok) sampel.push(hasil.embedding);
    await new Promise((r) => setTimeout(r, 250));
  }

  if (sampel.length === 0) {
    return {
      ok: false,
      pesan: "Wajah tidak terdeteksi. Coba lagi dengan pencahayaan lebih baik.",
    };
  }

  return { ok: true, sampel };
}

/** Streaming kamera depan; pemanggil wajib memanggil stopKamera saat selesai. */
export async function bukaKamera(
  video: HTMLVideoElement,
): Promise<{ ok: true } | { ok: false; pesan: string }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, pesan: "Browser tidak mendukung akses kamera." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    return { ok: true };
  } catch {
    return {
      ok: false,
      pesan:
        "Kamera tidak dapat diakses. Izinkan kamera pada browser, lalu muat ulang halaman.",
    };
  }
}

/** Hentikan semua track kamera agar lampu indikator mati. */
export function stopKamera(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}
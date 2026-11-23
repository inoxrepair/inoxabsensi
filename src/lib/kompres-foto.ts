/**
 * Kompres foto di browser (canvas) sebelum upload, supaya foto dari kamera
 * HP yang aslinya bermega-mega tidak membebani database dan lolos batas
 * 2 MB di server. Dipakai foto profil dan foto bukti izin
 * (512 px, kualitas 0.82). Hasil selalu JPEG; bila canvas tidak
 * tersedia, berkas asli dikembalikan apa adanya.
 */
export async function kompresFoto(
  file: File,
  maksPx = 512,
  kualitas = 0.82,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const gambar = new Image();
    await new Promise<void>((selesai, gagal) => {
      gambar.onload = () => selesai();
      gambar.onerror = () => gagal(new Error("gagal memuat gambar"));
      gambar.src = url;
    });
    const sisi = Math.max(gambar.width, gambar.height);
    const skala = sisi > maksPx ? maksPx / sisi : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(gambar.width * skala);
    canvas.height = Math.round(gambar.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(gambar, 0, 0, canvas.width, canvas.height);
    const hasil = await new Promise<Blob | null>((selesai) =>
      canvas.toBlob(selesai, "image/jpeg", kualitas),
    );
    return hasil ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

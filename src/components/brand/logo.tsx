/**
 * Logo aplikasi.
 *
 * - Tanpa logo kustom (versi null): kotak hitam bawaan + teks "iNOX Absensi".
 * - Dengan logo kustom (versi ada): gambar kustom saja, tanpa teks di
 *   sampingnya, karena logo perusahaan biasanya sudah memuat namanya
 *   sendiri (mis. "iNOX REPAIR") — teks dobel hanya membuat logo terlihat
 *   kecil dan membingungkan.
 *
 * Gambar diambil dari /api/logo dengan query `?v=` (waktu terakhir logo
 * diubah). Query itu penting: layout admin tidak di-remount saat pindah
 * halaman lewat sidebar, jadi tanpa src yang berubah, browser akan terus
 * menampilkan gambar lama yang sudah ada di DOM.
 */
export function Logo({
  size = 32,
  variant = "dark",
  versi = null,
}: {
  size?: number;
  variant?: "dark" | "light";
  versi?: string | null;
}) {
  void variant;

  if (versi) {
    return (
      <img
        src={`/api/logo?v=${versi}`}
        alt="Logo aplikasi"
        style={{
          height: size,
          width: "auto",
          maxWidth: 200,
          objectFit: "contain",
        }}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/api/logo"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      <span className="text-[15px] font-semibold tracking-tight">
        iNOX <span className="font-normal text-muted">Absensi</span>
      </span>
    </span>
  );
}

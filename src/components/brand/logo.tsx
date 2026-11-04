/**
 * Logo aplikasi. Gambar diambil dari /api/logo: logo kustom yang diunggah
 * lewat Pengaturan bila ada, kalau tidak ada, SVG kotak hitam bawaan.
 * Prop variant dipertahankan untuk kompatibilitas pemanggil lama; gambar
 * kustom maupun bawaan dipakai apa adanya.
 */
export function Logo({
  size = 32,
  variant = "dark",
}: {
  size?: number;
  variant?: "dark" | "light";
}) {
  void variant;
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

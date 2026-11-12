/**
 * Latar aurora lembut untuk halaman berkaca (depan, login, absen).
 *
 * Kaca cair hanya terlihat bila ada warna di belakangnya — di atas latar
 * polos, refraksi dan frost tidak kelihatan. Blob warna lembut ini memberi
 * kaca sesuatu untuk dibiaskan, sambil tetap terang dan mudah dibaca.
 * Warna sengaja dibuat lembut (biru, ungu, mint) supaya tetap terasa iNox.
 */
export function LatarLiquid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f0fdfa 100%)",
      }}
    >
      <div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full opacity-70 blur-3xl"
        style={{ background: "#bfdbfe" }}
      />
      <div
        className="absolute top-1/4 -right-28 h-96 w-96 rounded-full opacity-60 blur-3xl"
        style={{ background: "#ddd6fe" }}
      />
      <div
        className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{ background: "#a7f3d0" }}
      />
      <div
        className="absolute top-2/3 right-1/4 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "#fbcfe8" }}
      />
    </div>
  );
}

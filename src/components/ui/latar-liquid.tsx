/**
 * Latar aurora lembut untuk halaman berkaca (depan, login, absen).
 *
 * Kaca cair hanya terlihat bila ada warna di belakangnya — di atas latar
 * polos, refraksi dan frost tidak kelihatan. Blob warna lembut ini memberi
 * kaca sesuatu untuk dibiaskan, sambil tetap terang dan mudah dibaca.
 * Warna sengaja dibuat lembut (biru, ungu, mint) supaya tetap terasa iNox.
 * Bila sistem HP dalam mode gelap, aurora ikut gelap (blob pekat, redup)
 * supaya kaca tidak menyilaukan.
 *
 * PENTING: latar ini sengaja `absolute`, BUKAN `fixed`. Alat yang memotret
 * ulang halaman (mis. ekstensi Swarm Rebuild) menggambar latar `fixed` DI
 * ATAS konten hasil rebuild, sehingga yang tampil hanya backgroundnya.
 * Dengan `absolute` di dalam wadah halaman yang `relative`, tampilannya
 * sama persis saat halaman dimuat; bedanya hanya latar ikut bergeser saat
 * halaman panjang di-scroll (bukan menempel di layar).
 */
export function LatarLiquid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f0fdfa_100%)] dark:bg-[linear-gradient(180deg,#0a0a0f_0%,#131328_50%,#08110f_100%)]"
    >
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#bfdbfe] opacity-70 blur-3xl dark:bg-[#1d4ed8] dark:opacity-40" />
      <div className="absolute top-1/4 -right-28 h-96 w-96 rounded-full bg-[#ddd6fe] opacity-60 blur-3xl dark:bg-[#6d28d9] dark:opacity-35" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#a7f3d0] opacity-50 blur-3xl dark:bg-[#065f46] dark:opacity-35" />
      <div className="absolute top-2/3 right-1/4 h-56 w-56 rounded-full bg-[#fbcfe8] opacity-40 blur-3xl dark:bg-[#9d174d] dark:opacity-30" />
    </div>
  );
}

const CACHE = "inox-static-v3";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon.svg", "/offline.html"];

/** Batas waktu satu percobaan fetch navigasi — tanpa ini koneksi yang
 *  menggantung membuat pengguna menatap loading tanpa kepastian. */
const BATAS_FETCH_MS = 10000;
/** Jeda sebelum percobaan ulang — cukup untuk lewatnya gangguan sesaat
 *  (pindah WiFi/data, restart service saat deploy). */
const JEDA_ULANG_MS = 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function fetchDenganBatas(request) {
  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), BATAS_FETCH_MS);
  return fetch(request, { signal: kontrol.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data autentikasi dan halaman operasional selalu network-only agar
  // absensi, jadwal, payroll, dan rekap tidak pernah memakai data basi.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/karyawan") ||
    url.pathname === "/login"
  ) {
    if (request.mode === "navigate") {
      // Jangan langsung menyerah ke halaman offline: gangguan sesaat
      // (pindah jaringan, restart service saat deploy) cukup diatasi
      // dengan satu percobaan ulang. Hanya bila keduanya gagal,
      // tampilkan halaman offline.
      event.respondWith(
        fetchDenganBatas(request)
          .catch(
            () =>
              new Promise((s) => setTimeout(s, JEDA_ULANG_MS)).then(() =>
                fetch(request.clone()),
              ),
          )
          .catch(() => caches.match("/offline.html")),
      );
    }
    return;
  }

  // Cache-first hanya untuk aset build yang immutable dan aset publik.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Dibutuhkan Docker/hosting Node agar output produksi mandiri dan kecil.
  output: "standalone",
  // Mengaktifkan forbidden() agar halaman admin bisa mengembalikan 403
  // saat role tidak punya izin menu (dipakai di src/lib/session.ts).
  experimental: { authInterrupts: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
        ],
      },
      {
        // Browser harus mengecek versi service worker pada setiap load.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

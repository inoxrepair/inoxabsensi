import { bacaLogoAplikasi } from "@/lib/pengaturan";

/**
 * Logo yang dipakai komponen Logo di seluruh aplikasi. Sengaja lewat endpoint,
 * bukan prop dari tiap layout, supaya Logo yang dipakai di komponen client
 * (header admin) tidak perlu prop-drilling dari server.
 *
 * Bila belum ada logo kustom, kembalikan SVG kotak hitam yang sama dengan
 * logo bawaan. Cache dimatikan supaya logo baru langsung terlihat setelah
 * diunggah, tanpa perlu menunggu cache browser habis.
 */
const LOGO_BAWAAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111111"/><path d="M9 22V13.5M9 10.6h.01" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><path d="M15.5 22V13.5c0-.6.5-1 1.1-1h3.3c1.4 0 2.6 1.1 2.6 2.6V22" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logo = await bacaLogoAplikasi();
    if (logo) {
      const cocok = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(logo);
      if (cocok) {
        return new Response(Buffer.from(cocok[2], "base64"), {
          headers: {
            "Content-Type": cocok[1],
            "Cache-Control": "no-store",
          },
        });
      }
    }
  } catch {
    // Database belum termigrasi / tidak terjangkau: jatuh ke logo bawaan.
  }
  return new Response(LOGO_BAWAAN_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iNox Absensi",
    short_name: "iNox",
    description: "Absensi GPS, jadwal shift, rekap, dan payroll iNox.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#111111",
    orientation: "portrait-primary",
    lang: "id",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

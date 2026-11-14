import type { SVGProps } from "react";

/**
 * Ikon minimalis tiap menu admin — garis tipis (stroke 1.8), tanpa isi,
 * mengikuti warna teks (currentColor) supaya ikut tema terang/gelap dan
 * status aktif. Dipakai saat sidebar diciutkan: satu ubin berisi logo
 * saja, tanpa singkatan nama menu. Tanpa library ikon baru: semua SVG
 * digambar tangan di sini.
 */
function Bingkai({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IkonMenu({
  href,
  ...props
}: SVGProps<SVGSVGElement> & { href: string }) {
  switch (href) {
    case "/admin":
      // Dashboard: empat kotak (grid 2x2).
      return (
        <Bingkai {...props}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </Bingkai>
      );
    case "/admin/cabang":
      // Cabang: gedung kantor.
      return (
        <Bingkai {...props}>
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          <path d="M3 21h18" />
          <path d="M10 21v-3.5h4V21" />
          <path d="M9 8.5h.01M12 8.5h.01M15 8.5h.01" />
        </Bingkai>
      );
    case "/admin/karyawan":
      // Karyawan: orang (kepala + bahu).
      return (
        <Bingkai {...props}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" />
        </Bingkai>
      );
    case "/admin/log-absensi":
      // Log Absensi: papan klip berisi daftar.
      return (
        <Bingkai {...props}>
          <rect x="6" y="5" width="12" height="16" rx="2" />
          <path d="M9 5a3 3 0 0 1 6 0" />
          <path d="M9.5 12h5M9.5 15.5h3.5" />
        </Bingkai>
      );
    case "/admin/izin":
      // Izin: dokumen dengan tanda centang.
      return (
        <Bingkai {...props}>
          <path d="M13.5 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8.5L13.5 3.5Z" />
          <path d="M13.5 3.5V8.5H18" />
          <path d="M9 13.5l2 2 4-4.5" />
        </Bingkai>
      );
    case "/admin/jadwal":
      // Jadwal Shift: kalender.
      return (
        <Bingkai {...props}>
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 10h17" />
          <path d="M8 3v4M16 3v4" />
        </Bingkai>
      );
    case "/admin/rekap":
      // Rekap Absensi: diagram batang.
      return (
        <Bingkai {...props}>
          <path d="M4 20h16" />
          <path d="M8 16v-4M12 16V7M16 16v-6" />
        </Bingkai>
      );
    case "/admin/kasbon":
      // Kasbon: uang kertas.
      return (
        <Bingkai {...props}>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M6.5 9.5h.01M17.5 14.5h.01" />
        </Bingkai>
      );
    case "/admin/payroll":
      // Payroll: struk/slip gaji.
      return (
        <Bingkai {...props}>
          <path d="M6 3.5h12V21l-2-1.4-2 1.4-2-1.4L10 21l-2-1.4L6 21V3.5Z" />
          <path d="M9.5 8h5M9.5 11.5h5" />
        </Bingkai>
      );
    case "/admin/insentif":
      // Insentif: grafik naik.
      return (
        <Bingkai {...props}>
          <path d="M4 17.5l5-6 3.5 3L20 7" />
          <path d="M15.5 7H20v4.5" />
        </Bingkai>
      );
    case "/admin/log-login":
      // Log Login: pintu dengan panah masuk.
      return (
        <Bingkai {...props}>
          <path d="M15 3.5h3.5A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5H15" />
          <path d="M4 12h10" />
          <path d="M11 8l4 4-4 4" />
        </Bingkai>
      );
    case "/admin/informasi":
      // Informasi: huruf "i" dalam lingkaran.
      return (
        <Bingkai {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </Bingkai>
      );
    case "/admin/pengaturan":
      // Pengaturan: roda gigi minimalis.
      return (
        <Bingkai {...props}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4" />
          <path d="M8 8l-1.8-1.8M16 8l1.8-1.8M8 16l-1.8 1.8M16 16l1.8 1.8" />
        </Bingkai>
      );
    default:
      // Menu lain yang belum punya ikon: kotak generik.
      return (
        <Bingkai {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </Bingkai>
      );
  }
}

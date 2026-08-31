import type { StatusAbsensi } from "@/lib/domain";

/**
 * Badge status absensi. Aksen warna HANYA dipakai di sini supaya
 * status terbaca cepat tanpa mengotori palet hitam-putih-abu.
 */
const STYLE: Record<StatusAbsensi, { label: string; className: string }> = {
  hadir: {
    label: "Hadir",
    className: "bg-status-hadir/10 text-status-hadir ring-status-hadir/25",
  },
  telat: {
    label: "Telat",
    className: "bg-status-alpa/10 text-status-alpa ring-status-alpa/25",
  },
  alpa: {
    label: "Alpa",
    className: "bg-status-alpa/10 text-status-alpa ring-status-alpa/25",
  },
  izin: {
    label: "Izin",
    className: "bg-status-izin/10 text-status-izin ring-status-izin/25",
  },
  libur: {
    label: "Libur",
    className: "bg-surface text-muted ring-line",
  },
};

export function StatusBadge({ status }: { status: StatusAbsensi }) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}

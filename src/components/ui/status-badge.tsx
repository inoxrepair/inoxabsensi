import type { StatusAbsensi } from "@/lib/domain";
import { Badge } from "./badge";

/**
 * Badge status absensi. Aksen warna HANYA dipakai di sini supaya
 * status terbaca cepat tanpa mengotori palet hitam-putih-abu.
 * Varian Badge hadir/telat/alpa/izin/libur memakai warna yang sama
 * dengan pemetaan lama di sini.
 */
const LABEL: Record<StatusAbsensi, string> = {
  hadir: "Hadir",
  telat: "Telat",
  alpa: "Alpa",
  izin: "Izin",
  libur: "Libur",
};

export function StatusBadge({ status }: { status: StatusAbsensi }) {
  return <Badge variant={status}>{LABEL[status]}</Badge>;
}

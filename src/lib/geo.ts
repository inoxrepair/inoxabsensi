/** Perhitungan jarak GPS untuk validasi radius absensi. */

export type Koordinat = { lat: number; lng: number };

const RADIUS_BUMI_METER = 6_371_008.8;
const KE_RADIAN = Math.PI / 180;

/**
 * Jarak great-circle antara dua koordinat dalam meter (formula Haversine).
 * Akurasi cukup untuk radius puluhan-ratusan meter yang dipakai absensi.
 */
export function jarakMeter(a: Koordinat, b: Koordinat): number {
  const dLat = (b.lat - a.lat) * KE_RADIAN;
  const dLng = (b.lng - a.lng) * KE_RADIAN;
  const latA = a.lat * KE_RADIAN;
  const latB = b.lat * KE_RADIAN;

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLng * sinLng;

  // Math.asin(Math.sqrt(h)) lebih stabil daripada atan2 untuk jarak pendek.
  return 2 * RADIUS_BUMI_METER * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type HasilRadius = {
  dalamRadius: boolean;
  /** Jarak dibulatkan ke meter terdekat, siap ditampilkan & disimpan. */
  jarakMeter: number;
};

/** Cek apakah posisi karyawan berada dalam radius cabang. */
export function periksaRadius(
  posisi: Koordinat,
  cabang: Koordinat & { radiusMeter: number },
): HasilRadius {
  const jarak = Math.round(jarakMeter(posisi, cabang));
  return { dalamRadius: jarak <= cabang.radiusMeter, jarakMeter: jarak };
}

/** Helper format tampilan (locale Indonesia). */

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(nilai: number) {
  return RUPIAH.format(nilai);
}

const TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Terima string ISO (yyyy-mm-dd) supaya hasil render server & klien sama. */
export function formatTanggal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return TANGGAL.format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatKoordinat(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

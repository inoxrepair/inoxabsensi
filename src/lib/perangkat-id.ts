/**
 * ID perangkat per HP — kode acak yang membedakan tiap browser/HP.
 *
 * Latar belakang: User-Agent iPhone tidak pernah membawa model HP
 * (semua iPhone tampil "Safari · iPhone"), jadi kolom Perangkat di Log
 * Login tidak bisa membedakan dua iPhone. ID ini menutup lubang itu:
 * tiap browser yang membuka aplikasi mendapat satu kode, disimpan di
 * localStorage DAN cookie (keduanya, supaya kalau salah satu terhapus
 * yang lain memulihkannya). Server membaca cookie-nya saat mencatat
 * login/logout, jadi tiap baris LogLogin tahu HP mana yang dipakai.
 *
 * ID ini BUKAN bukti identitas: siapa pun bisa menghapusnya (bersihkan
 * data browser) dan mendapat kode baru, dan satu HP dengan dua browser
 * punya dua kode. Ia hanya sinyal korelasi untuk tanda "Perlu diperiksa".
 *
 * Murni, tanpa akses database; aman dipakai di client maupun server.
 */

/** Kunci localStorage + nama cookie (sama, supaya mudah dilacak). */
export const KUNCI_ID_PERANGKAT = "inox-perangkat-id";
export const NAMA_COOKIE_PERANGKAT = "inox-perangkat-id";

/** Bentuk ID: 10 karakter heksadesimal huruf besar, mis. "A3F9C21E87". */
export function buatIdPerangkat(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** ID hanya diterima bila persis bentuk yang dibuat buatIdPerangkat. */
export function apakahIdPerangkatValid(nilai: string): boolean {
  return /^[0-9A-F]{10}$/.test(nilai);
}

/** Cari ID perangkat di string cookie (mis. document.cookie). */
export function bacaIdPerangkatDariCookie(cookie: string): string | null {
  for (const bagian of cookie.split(";")) {
    const [nama, ...sisa] = bagian.trim().split("=");
    if (nama === NAMA_COOKIE_PERANGKAT) {
      const nilai = sisa.join("=").trim();
      return apakahIdPerangkatValid(nilai) ? nilai : null;
    }
  }
  return null;
}

function simpanIdPerangkat(id: string): void {
  try {
    window.localStorage?.setItem(KUNCI_ID_PERANGKAT, id);
  } catch {
    // Abaikan: penyimpanan lokal bisa ditolak (mode privat dsb).
  }
  try {
    const aman =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${NAMA_COOKIE_PERANGKAT}=${id}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax${aman}`;
  } catch {
    // Abaikan: cookie bisa ditolak.
  }
}

/**
 * Baca ID perangkat di browser (client saja; di server mengembalikan
 * null). Urutan: localStorage, lalu cookie, lalu buat baru. Hasilnya
 * selalu ditulis kembali ke kedua tempat supaya tetap sinkron.
 */
export function bacaIdPerangkat(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const dariSimpanan = window.localStorage?.getItem(KUNCI_ID_PERANGKAT);
    if (dariSimpanan && apakahIdPerangkatValid(dariSimpanan)) {
      simpanIdPerangkat(dariSimpanan);
      return dariSimpanan;
    }
    const dariCookie = bacaIdPerangkatDariCookie(document.cookie ?? "");
    if (dariCookie) {
      simpanIdPerangkat(dariCookie);
      return dariCookie;
    }
    const baru = buatIdPerangkat();
    simpanIdPerangkat(baru);
    return baru;
  } catch {
    return null;
  }
}

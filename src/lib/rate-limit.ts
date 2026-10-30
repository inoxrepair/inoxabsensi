/**
 * Rate limit login sederhana, in-memory.
 * Catatan desain (didokumentasikan, bukan disembunyikan): penyimpanan
 * sengaja in-memory per proses server, bukan tabel database, supaya tidak
 * menambah migrasi dan tidak memperlambat login normal. Konsekuensinya
 * hitungan reset bila proses server restart atau bila ada lebih dari satu
 * instance; itu diterima untuk perlindungan dasar, bukan anti-brute-force
 * tingkat lanjut. Batas dan jendela bisa diubah lewat konstanta di bawah.
 * Fungsi menerima `sekarang` dan `penyimpanan` opsional supaya bisa diuji
 * tanpa menunggu jendela waktu.
 */

export const BATAS_GAGAL_LOGIN = 10;
export const JENDELA_GAGAL_LOGIN_MS = 15 * 60 * 1000;

export type PenyimpananGagalLogin = Map<string, number[]>;

const penyimpananGlobal: PenyimpananGagalLogin = new Map();

export function kunciGagalLogin(identifier: string, ip: string): string {
  return `${identifier.trim().toLowerCase()}|${ip}`;
}

function bersihkan(
  penyimpanan: PenyimpananGagalLogin,
  kunci: string,
  sekarang: number,
): number[] {
  const batas = sekarang - JENDELA_GAGAL_LOGIN_MS;
  const segar = (penyimpanan.get(kunci) ?? []).filter((w) => w > batas);
  if (segar.length) penyimpanan.set(kunci, segar);
  else penyimpanan.delete(kunci);
  return segar;
}

export function batasLoginTercapai(
  identifier: string,
  ip: string,
  sekarang: number = Date.now(),
  penyimpanan: PenyimpananGagalLogin = penyimpananGlobal,
): boolean {
  return (
    bersihkan(penyimpanan, kunciGagalLogin(identifier, ip), sekarang).length >=
    BATAS_GAGAL_LOGIN
  );
}

export function catatGagalLogin(
  identifier: string,
  ip: string,
  sekarang: number = Date.now(),
  penyimpanan: PenyimpananGagalLogin = penyimpananGlobal,
): void {
  const kunci = kunciGagalLogin(identifier, ip);
  const segar = bersihkan(penyimpanan, kunci, sekarang);
  segar.push(sekarang);
  penyimpanan.set(kunci, segar);
}

export function resetGagalLogin(
  identifier: string,
  ip: string,
  penyimpanan: PenyimpananGagalLogin = penyimpananGlobal,
): void {
  penyimpanan.delete(kunciGagalLogin(identifier, ip));
}

export function bersihkanPenyimpananGagalLogin(
  penyimpanan: PenyimpananGagalLogin = penyimpananGlobal,
): void {
  penyimpanan.clear();
}

/**
 * Aturan log login/logout (murni, tanpa akses database).
 *
 * Tujuannya menangkap titip absen: satu perangkat dipakai untuk login ke
 * beberapa akun. IP saja tidak cukup — satu WiFi kantor berbagi satu IP
 * publik — dan User-Agent iPhone tidak membawa model HP, jadi sidik
 * perangkat memakai ID perangkat (kode acak per browser, dari cookie)
 * bila ada, dan jatuh kembali ke IP + User-Agent mentah bila belum ada.
 */

export const JENIS_LOG_LOGIN = ["masuk", "keluar"] as const;
export type JenisLogLogin = (typeof JENIS_LOG_LOGIN)[number];

export const LABEL_JENIS_LOG_LOGIN: Record<JenisLogLogin, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
};

export function bacaJenisLogLogin(nilai: string): JenisLogLogin {
  return nilai === "keluar" ? "keluar" : "masuk";
}

/** Jendela waktu aturan 1: satu perangkat dipakai beberapa akun di rentang ini. */
export const JANELA_MENCURIGAKAN_MENIT = 30;

/**
 * Label perangkat dari User-Agent mentah, mis. "Chrome · Android (SM-A546E)"
 * atau "Safari · iPhone". Model Android diambil dari segmen "...; MODEL
 * Build/...". User-Agent kosong atau tak dikenal -> "Tidak diketahui".
 */
export function perangkatDariAgen(agen: string): string {
  if (!agen.trim()) return "Tidak diketahui";

  let os = "Perangkat lain";
  let model = "";
  const android = /Android[^;]*;\s*([^;)]+?)\s+Build/i.exec(agen);
  if (/iPhone/.test(agen)) os = "iPhone";
  else if (/iPad/.test(agen)) os = "iPad";
  else if (android) {
    os = "Android";
    model = android[1].trim();
  } else if (/Windows NT/.test(agen)) os = "Windows";
  else if (/Mac OS X/.test(agen)) os = "Mac";
  else if (/Linux/.test(agen)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//.test(agen)) browser = "Edge";
  else if (/Chrome\//.test(agen)) browser = "Chrome";
  else if (/Firefox\//.test(agen)) browser = "Firefox";
  else if (/Safari\//.test(agen)) browser = "Safari";

  return model ? `${browser} · ${os} (${model})` : `${browser} · ${os}`;
}

/**
 * Sidik perangkat untuk pengelompokan. Bila baris punya ID perangkat,
 * sidiknya ID itu (dua iPhone yang User-Agent-nya sama tetap dibedakan);
 * bila belum ada ID (baris lama), jatuh kembali ke IP + User-Agent
 * mentah. Karena itu satu HP yang sama bisa punya dua sidik berbeda
 * sebelum/sesudah ID perangkat dipasang — masa peralihan yang singkat.
 */
export function sidikPerangkat(
  ip: string,
  agen: string,
  perangkatId?: string | null,
): string {
  if (perangkatId) return `id:${perangkatId}`;
  return `${ip}|${agen}`;
}

export type BarisLogLogin = {
  id: string;
  userId: string;
  /** Cabang penempatan karyawan saat ini (untuk filter). */
  cabangId: string;
  nama: string;
  cabang: string;
  jenis: JenisLogLogin;
  ip: string;
  agen: string;
  /** ID perangkat per HP; null untuk baris sebelum fitur ini. */
  perangkatId: string | null;
  dibuatPada: Date;
};

/**
 * Tandai baris yang perlu diperiksa. Mengembalikan Map id -> alasan.
 *
 * Sidik yang dipakai di sini adalah sidik KANONIK per akun: baris tanpa
 * ID "mewarisi" ID dari baris ber-ID di akun yang sama dengan IP +
 * User-Agent yang sama. Ini masa peralihan ID perangkat: HP yang sama
 * tampil dua sidik (fallback lama vs ID baru) sebelum semua baris punya
 * ID — tanpa ini, baris ber-ID pertama seorang karyawan langsung
 * ditandai "Perangkat berbeda dari biasanya" padahal HP-nya sama. Bila
 * satu kunci IP+UA memetakan ke >1 ID di akun itu (mis. dua HP), baris
 * lama tetap memakai fallback — tidak ditebak.
 *
 * Aturan 1: satu perangkat (sidik kanonik sama) dipakai >= 2 akun
 * berbeda dalam 30 menit — pola titip absen.
 *
 * Aturan 2: akun login dari perangkat yang berbeda dari perangkat yang
 * paling sering ia pakai — kemungkinan akun dipakai orang lain. Perlu
 * >= 3 baris akun itu dan perangkat biasanya muncul >= 2 kali, supaya
 * login pertama dari HP baru tidak langsung ditandai.
 *
 * Tanda ini berarti "perlu diperiksa", bukan bukti curang.
 */
export function tandaiMencurigakan(
  baris: BarisLogLogin[],
): Map<string, string> {
  const hasil = new Map<string, string>();

  const idPerKunciPerAkun = new Map<string, Map<string, Set<string>>>();
  for (const b of baris) {
    if (!b.perangkatId) continue;
    const kunci = `${b.ip}|${b.agen}`;
    let perAkun = idPerKunciPerAkun.get(b.userId);
    if (!perAkun) {
      perAkun = new Map();
      idPerKunciPerAkun.set(b.userId, perAkun);
    }
    let ids = perAkun.get(kunci);
    if (!ids) {
      ids = new Set();
      perAkun.set(kunci, ids);
    }
    ids.add(b.perangkatId);
  }
  const sidik = (b: BarisLogLogin): string => {
    if (b.perangkatId) return `id:${b.perangkatId}`;
    const ids = idPerKunciPerAkun
      .get(b.userId)
      ?.get(`${b.ip}|${b.agen}`);
    if (ids && ids.size === 1) return `id:${[...ids][0]}`;
    return `${b.ip}|${b.agen}`;
  };

  // Aturan 1: jendela geser 30 menit per sidik perangkat.
  const perSidik = new Map<string, BarisLogLogin[]>();
  for (const b of baris) {
    const daftar = perSidik.get(sidik(b)) ?? [];
    daftar.push(b);
    perSidik.set(sidik(b), daftar);
  }
  for (const daftar of perSidik.values()) {
    const urut = [...daftar].sort(
      (a, b) => a.dibuatPada.getTime() - b.dibuatPada.getTime(),
    );
    for (let i = 0; i < urut.length; i++) {
      const jendela = [urut[i]];
      for (let j = i + 1; j < urut.length; j++) {
        if (
          urut[j].dibuatPada.getTime() - urut[i].dibuatPada.getTime() <=
          JANELA_MENCURIGAKAN_MENIT * 60_000
        ) {
          jendela.push(urut[j]);
        } else {
          break;
        }
      }
      const akun = new Set(jendela.map((b) => b.userId));
      if (akun.size >= 2) {
        for (const b of jendela) {
          if (!hasil.has(b.id)) {
            hasil.set(b.id, `Satu perangkat dipakai ${akun.size} akun`);
          }
        }
      }
    }
  }

  // Aturan 2: perangkat berbeda dari biasanya.
  const perAkun = new Map<string, BarisLogLogin[]>();
  for (const b of baris) {
    const daftar = perAkun.get(b.userId) ?? [];
    daftar.push(b);
    perAkun.set(b.userId, daftar);
  }
  for (const daftar of perAkun.values()) {
    if (daftar.length < 3) continue;
    const hitung = new Map<string, number>();
    for (const b of daftar) {
      hitung.set(sidik(b), (hitung.get(sidik(b)) ?? 0) + 1);
    }
    let biasa = "";
    let terbanyak = 0;
    for (const [k, n] of hitung) {
      if (n > terbanyak) {
        biasa = k;
        terbanyak = n;
      }
    }
    if (terbanyak < 2) continue;
    for (const b of daftar) {
      if (sidik(b) !== biasa && !hasil.has(b.id)) {
        hasil.set(b.id, "Perangkat berbeda dari biasanya");
      }
    }
  }

  return hasil;
}

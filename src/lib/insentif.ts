/**
 * Fungsi untuk sinkronisasi data insentif dari inox.my.id ke iNox Absensi.
 * Semua I/O (Prisma + HTTP) ada di sini; halaman dan API route hanya
 * memanggil fungsi-fungsi ini.
 *
 * Alur sinkron (jalankanSinkronInsentif): login ke inox.my.id -> ambil
 * CSRF dari halaman laporan insentif -> tarik feed AJAX
 * /reports/incentive-line-orders -> kelompokkan per karyawan (cocok nama)
 * -> simpan ke tabel InsentifTransaksi (satu baris per transaksi).
 * Baris transaksi disimpan apa adanya (dengan tanggalnya), supaya laporan
 * Insentif dan Payroll bisa menjumlahkan insentif untuk rentang tanggal
 * apa pun — bukan hanya per bulan. Sinkron menimpa baris dalam rentang
 * yang ditarik (hapus lalu isi ulang), jadi sinkron ulang tidak
 * menggandakan. Tabel Insentif lama (agregat per karyawan per periode)
 * sudah tidak dibaca lagi; kolom Payroll.insentif sudah dihapus.
 */

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import { takeHomePay } from "@/lib/payroll";
import { periodeValid, rentangPeriodeGajian, tanggalValid } from "@/lib/rekap";

/**
 * Akses tabel InsentifTransaksi / PemetaanInsentif sengaja lewat SQL
 * mentah, bukan delegate Prisma: delegate baru tersedia setelah
 * `prisma generate` dijalankan ulang, sedangkan generate di VM ini gagal
 * mengunduh engine (jaringan proxy). Tabelnya tetap didefinisikan di
 * schema Prisma + migrasi Postgres, jadi delegate bisa dipakai nanti
 * setelah generate berhasil (mis. saat build di VPS). SQL di sini
 * kompatibel dengan Postgres (produksi) maupun SQLite (dev lokal).
 */

/** Satu baris transaksi insentif tersimpan (satu baris feed iNOX). */
export type BarisInsentifTransaksi = {
  id: string;
  userId: string;
  tanggal: string;
  transactionId: number;
  invoiceNo: string;
  productName: string;
  quantity: number;
  jumlah: number;
  lokasi: string;
  sinkronPada: Date;
};

/** Ringkasan insentif per karyawan untuk satu rentang tanggal. */
export type RingkasanInsentif = {
  userId: string;
  jumlah: number;
  jumlahTransaksi: number;
  tanggalAwal: string | null;
  tanggalAkhir: string | null;
  sinkronPada: Date | null;
};

/** Ringkasan insentif beserta data user pemiliknya (nama + cabang). */
export type RingkasanInsentifDenganUser = RingkasanInsentif & {
  user: {
    id: string;
    name: string;
    username: string | null;
    cabangNama: string | null;
  };
};

/** Normalisasi nama untuk pencocokan: huruf kecil, buang semua spasi/simbol. */
export function normalisasiNama(nama: string): string {
  return nama
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * "05-11-2026" (dd-mm-yyyy, format transaction_date iNOX) -> "2026-11-05".
 * Kembalikan "" bila tidak cocok pola.
 */
export function ubahTanggalKeIso(tanggal: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(tanggal.trim());
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Pisah satu header Set-Cookie gabungan menjadi daftar cookie mentah.
 * Memisah hanya pada koma yang diikuti nama-cookie baru (token + "="),
 * sehingga koma di dalam tanggal Expires (mis. "Thu, 01 Jan 2026 ...")
 * tidak ikut memotong cookie.
 */
export function pecahSetCookie(header: string): string[] {
  if (!header.trim()) return [];
  return header
    .split(/,\s*(?=[A-Za-z0-9_-]+\s*=)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ambil bagian "nama=nilai" dari tiap Set-Cookie, gabung jadi header Cookie. */
export function gabungkanCookie(setCookie: string[]): string {
  return setCookie
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/**
 * Baca semua cookie dari respons fetch. Utamakan getSetCookie() (undici)
 * yang sudah memisah per cookie; fallback ke parse manual bila tidak ada.
 */
export function bacaCookieDariHeaders(headers: Headers): string {
  const denganGetSetCookie = headers as unknown as {
    getSetCookie?: () => string[];
  };
  if (typeof denganGetSetCookie.getSetCookie === "function") {
    return gabungkanCookie(denganGetSetCookie.getSetCookie());
  }
  // Fallback untuk implementasi fetch lama tanpa getSetCookie. Catatan:
  // di undici, get("set-cookie") hanya mengembalikan cookie pertama,
  // jadi jalur ini tidak bisa diandalkan di sana — beruntungnya undici
  // selalu punya getSetCookie().
  const mentah = headers.get("set-cookie");
  return mentah ? gabungkanCookie(pecahSetCookie(mentah)) : "";
}

/** Ambil data insentif dari endpoint AJAX inox.my.id untuk rentang tanggal. */
export async function ambilDataInsentifInox({
  cookieJar,
  csrfToken,
  startDate,
  endDate,
}: {
  cookieJar: string;
  csrfToken: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): Promise<
  Array<{
    transactionId: number;
    invoiceNo: string;
    tanggal: string; // dd-mm-yyyy
    serviceStaff: string;
    productName: string;
    quantity: number;
    unitPriceBeforeDiscount: number;
    /**
     * Insentif baris ini = Total Komisi Tetap + Total Komisi Persentase
     * (kolom total di laporan iNOX). Tiap baris hanya satu jenis komisi
     * yang berisi (tetap ATAU persentase), jadi jumlah keduanya sama
     * dengan total komisi baris itu.
     */
    totalKomisi: number;
    totalUnitPrice: number;
    businessLocation: string;
  }>
> {
  const url = new URL("https://inox.my.id/reports/incentive-line-orders");
  url.searchParams.set("draw", "1");
  url.searchParams.set("start", "0");
  url.searchParams.set("length", "10000"); // ambil banyak data sekaligus
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("location_id", "");
  url.searchParams.set("service_staff_id", "");

  const res = await fetch(url.toString(), {
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://inox.my.id/reports/incentive-report",
      Cookie: cookieJar,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal ambil data insentif: HTTP ${res.status}`);
  }

  const json = await res.json();
  const rows: any[] = json.data ?? [];

  return rows.map(petakanBarisInsentif);
}

/** Angka di feed dikemas dalam <span data-orig-value="40000">40000</span>. */
function ambilAngka(nilai: any): number {
  if (typeof nilai === "number") return nilai;
  if (typeof nilai === "string") {
    const m = nilai.match(/data-orig-value="([\d.]+)"/);
    if (m) return Number(m[1]);
    return Number(nilai.replace(/[^0-9.-]/g, "") || 0);
  }
  return 0;
}

/**
 * Petakan satu baris mentah feed incentive-line-orders ke bentuk yang
 * dipakai sinkron. Diekspor supaya bisa diuji dengan baris asli dari feed.
 *
 * Insentif baris = total_technician_commission_value ("Total Komisi
 * Tetap") + total_technician_commission_percent_value ("Total Komisi
 * Persentase"). JANGAN pakai technician_commission_value ("Komisi
 * Tetap"): nilainya PER SATUAN, jadi baris dengan kwantitas > 1
 * terhitung kurang — mis. Service Fee INV2026-1563: Komisi Tetap
 * 25.000 x 3 tercatat 25.000, padahal Total Komisi Tetap-nya 75.000.
 */
export function petakanBarisInsentif(r: any): {
  transactionId: number;
  invoiceNo: string;
  tanggal: string;
  serviceStaff: string;
  productName: string;
  quantity: number;
  unitPriceBeforeDiscount: number;
  totalKomisi: number;
  totalUnitPrice: number;
  businessLocation: string;
} {
  const tanggalRaw = r.transaction_date ?? ""; // dd-mm-yyyy
  return {
    transactionId: r.transaction_id ?? 0,
    invoiceNo: r.invoice_no ?? "",
    tanggal: tanggalRaw,
    serviceStaff: r.service_staff ?? "",
    productName: r.product_name ?? "",
    quantity: ambilAngka(r.quantity),
    unitPriceBeforeDiscount: ambilAngka(r.unit_price_before_discount),
    totalKomisi:
      ambilAngka(r.total_technician_commission_value) +
      ambilAngka(r.total_technician_commission_percent_value),
    totalUnitPrice: ambilAngka(r.total_unit_price),
    businessLocation: r.business_location ?? "",
  };
}

/**
 * Cocokkan nama service_staff di inox.my.id ke User di iNox Absensi.
 * Urutan: (1) pemetaan manual (tabel PemetaanInsentif) didahulukan —
 * admin sudah memastikan orangnya, jadi pemetaan menang atas nama yang
 * sama persis sekalipun; (2) exact setelah normalisasi (tanpa
 * spasi/simbol, huruf kecil) — sengaja TANPA fallback contains, supaya
 * nama pendek tidak salah cocok ke orang lain. Nama yang tidak cocok
 * dikembalikan null dan dicatat sebagai tidakDicocokkan saat sinkron
 * untuk dipasangkan manual.
 */
export function cocokkanUser(
  serviceStaff: string,
  users: Array<{ id: string; name: string }>,
  pemetaan: Array<{ namaKunci: string; userId: string }> = [],
): string | null {
  const target = normalisasiNama(serviceStaff);
  if (!target) return null;
  const peta = pemetaan.find((p) => p.namaKunci === target);
  if (peta) return peta.userId;
  const ketemu = users.find((u) => normalisasiNama(u.name) === target);
  return ketemu ? ketemu.id : null;
}

/**
 * Kelompokkan baris feed yang sudah dipetakan per karyawan (murni, tanpa
 * I/O — bisa diuji). Satu baris feed = satu transaksi insentif; tanggal
 * disimpan sebagai ISO (yyyy-mm-dd) supaya bisa difilter rentang.
 * Baris yang tanggalnya tidak bisa dibaca dilewati dan dihitung di
 * `tanpaTanggal` (uangnya tidak ikut tersimpan — tanggal adalah kunci
 * rentang, jadi baris tanpa tanggal tidak bisa dilaporkan dengan benar).
 */
export type BarisInsentifDikelompokkan = {
  userId: string;
  jumlah: number;
  jumlahTransaksi: number;
  tanggalAwal: string | null;
  tanggalAkhir: string | null;
  baris: Array<{
    transactionId: number;
    invoiceNo: string;
    tanggal: string;
    productName: string;
    quantity: number;
    jumlah: number;
    lokasi: string;
  }>;
};

export function kelompokkanInsentifPerUser(
  data: Array<ReturnType<typeof petakanBarisInsentif>>,
  users: Array<{ id: string; name: string }>,
  pemetaan: Array<{ namaKunci: string; userId: string }> = [],
): {
  perUser: BarisInsentifDikelompokkan[];
  tidakDicocokkan: string[];
  tanpaTanggal: number;
} {
  const perUser = new Map<string, BarisInsentifDikelompokkan>();
  const tidakDicocokkan = new Set<string>();
  let tanpaTanggal = 0;

  for (const d of data) {
    const userId = cocokkanUser(d.serviceStaff, users, pemetaan);
    if (!userId) {
      tidakDicocokkan.add(d.serviceStaff);
      continue;
    }

    const tanggalIso = ubahTanggalKeIso(d.tanggal);
    if (!tanggalIso) {
      tanpaTanggal += 1;
      continue;
    }

    const kelompok = perUser.get(userId) ?? {
      userId,
      jumlah: 0,
      jumlahTransaksi: 0,
      tanggalAwal: null,
      tanggalAkhir: null,
      baris: [],
    };
    kelompok.jumlah += d.totalKomisi;
    kelompok.jumlahTransaksi += 1;
    if (!kelompok.tanggalAwal || tanggalIso < kelompok.tanggalAwal) {
      kelompok.tanggalAwal = tanggalIso;
    }
    if (!kelompok.tanggalAkhir || tanggalIso > kelompok.tanggalAkhir) {
      kelompok.tanggalAkhir = tanggalIso;
    }
    kelompok.baris.push({
      transactionId: d.transactionId,
      invoiceNo: d.invoiceNo,
      tanggal: tanggalIso,
      productName: d.productName,
      quantity: d.quantity,
      jumlah: d.totalKomisi,
      lokasi: d.businessLocation,
    });
    perUser.set(userId, kelompok);
  }

  return {
    perUser: [...perUser.values()],
    tidakDicocokkan: [...tidakDicocokkan],
    tanpaTanggal,
  };
}

/** Login ke inox.my.id dan kembalikan cookie jar (string Cookie header). */
async function loginInox(username: string, password: string): Promise<string> {
  const loginPage = await fetch("https://inox.my.id/login", {
    headers: { "User-Agent": "iNox-Absensi-Sync/1.0" },
    cache: "no-store",
  });

  const setCookieLogin = bacaCookieDariHeaders(loginPage.headers);

  const html = await loginPage.text();
  // Ambil _token dari form login (regex sederhana, cukup untuk halaman ini)
  const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
  const csrfToken = tokenMatch ? tokenMatch[1] : "";

  const formData = new URLSearchParams();
  formData.set("_token", csrfToken);
  formData.set("username", username);
  formData.set("password", password);
  formData.set("remember", "on");

  const loginRes = await fetch("https://inox.my.id/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "iNox-Absensi-Sync/1.0",
      ...(setCookieLogin ? { Cookie: setCookieLogin } : {}),
    },
    body: formData.toString(),
    // Tangani redirect sendiri: cookie sesi biasanya diset pada respons
    // 302, dan fetch dengan redirect "follow" tidak meneruskan cookie
    // dari respons perantara ke respons akhir.
    redirect: "manual",
    cache: "no-store",
  });

  // Cookie sesi bisa diset pada 302 login, atau sudah ada dari halaman login.
  const setCookieAfterLogin =
    bacaCookieDariHeaders(loginRes.headers) || setCookieLogin;

  // Login sukses biasanya redirect (ke /home atau /dashboard).
  const lokasi = loginRes.headers.get("location");
  const homeUrl = lokasi
    ? new URL(lokasi, "https://inox.my.id").toString()
    : "https://inox.my.id/home";

  // Verifikasi login berhasil dengan cek halaman tujuan redirect (home)
  const homeRes = await fetch(homeUrl, {
    headers: {
      "User-Agent": "iNox-Absensi-Sync/1.0",
      ...(setCookieAfterLogin ? { Cookie: setCookieAfterLogin } : {}),
    },
    cache: "no-store",
  });
  const homeHtml = await homeRes.text();
  if (!homeHtml.includes("Keluar")) {
    throw new Error("Login ke inox.my.id gagal. Periksa kredensial.");
  }

  return setCookieAfterLogin || "";
}

export type HasilSinkronInsentif = {
  ok: true;
  periode: string;
  totalUserDisinkron: number;
  totalTransaksi: number;
  tidakDicocokkan: string[];
  pesan: string;
};

/**
 * Jalankan satu kali sinkron insentif untuk periode "yyyy-mm".
 * Dipakai langsung oleh API route DAN server action — jangan panggil API
 * route lewat fetch dari server action, karena cookie sesi tidak ikut
 * terkirim dan route akan menjawab 401.
 *
 * Rentang transaksi yang ditarik adalah `dari`–`sampai` bila keduanya
 * diberikan dan sah (yang dipilih di filter halaman Insentif, seperti
 * filter Dari/Sampai di Log Absensi); bila tidak, dipakai siklus gajian
 * default periode itu (28 bulan sebelumnya s.d. 27 bulan periode).
 */
export async function jalankanSinkronInsentif(
  periode: string,
  dari?: string,
  sampai?: string,
): Promise<HasilSinkronInsentif> {
  if (!periodeValid(periode)) {
    throw new Error("Periode tidak valid.");
  }

  const rentang =
    dari && sampai && tanggalValid(dari) && tanggalValid(sampai)
      ? dari <= sampai
        ? { dari, sampai }
        : { dari: sampai, sampai: dari }
      : rentangPeriodeGajian(periode);
  const { dari: tanggalDari, sampai: tanggalSampai } = rentang;

  const INOX_USERNAME = process.env.INOX_USERNAME;
  const INOX_PASSWORD = process.env.INOX_PASSWORD;
  if (!INOX_USERNAME || !INOX_PASSWORD) {
    throw new Error(
      "Kredensial inox.my.id belum diatur di server (INOX_USERNAME / INOX_PASSWORD).",
    );
  }

  // 1. Login ke inox.my.id
  const cookieJar = await loginInox(INOX_USERNAME, INOX_PASSWORD);

  // 2. Ambil CSRF token dari halaman laporan insentif
  const reportPage = await fetch("https://inox.my.id/reports/incentive-report", {
    headers: {
      "User-Agent": "iNox-Absensi-Sync/1.0",
      Cookie: cookieJar,
    },
    cache: "no-store",
  });
  const reportHtml = await reportPage.text();
  const csrfMatch = reportHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
  const csrfToken = csrfMatch ? csrfMatch[1] : "";

  // 3. Ambil data insentif untuk rentang yang dipilih
  const data = await ambilDataInsentifInox({
    cookieJar,
    csrfToken,
    startDate: tanggalDari,
    endDate: tanggalSampai,
  });

  // 4. Ambil semua user untuk matching nama + pemetaan manual
  const users = await db.user.findMany({
    select: { id: true, name: true },
    where: { aktif: true },
  });
  const pemetaan = await db.$queryRaw<{ namaKunci: string; userId: string }[]>`
    SELECT "namaKunci", "userId" FROM "PemetaanInsentif"
  `;

  // 5. Kelompokkan per karyawan (murni) — baris transaksi + ringkasan.
  const { perUser, tidakDicocokkan, tanpaTanggal } =
    kelompokkanInsentifPerUser(data, users, pemetaan);

  // 6. Simpan baris transaksi: hapus baris lama dalam rentang untuk semua
  //    karyawan aktif (supaya sinkron ulang tidak menggandakan dan nama
  //    yang dipetakan ulang pindah ke akun yang benar), lalu sisipkan
  //    baris baru. Baris karyawan nonaktif dibiarkan — riwayat mereka
  //    tidak bisa dicocokkan ulang dari feed, jadi jangan dihapus.
  for (const u of users) {
    await db.$executeRaw`
      DELETE FROM "InsentifTransaksi"
      WHERE "userId" = ${u.id}
        AND "tanggal" >= ${tanggalDari} AND "tanggal" <= ${tanggalSampai}
    `;
  }
  for (const kelompok of perUser) {
    for (const b of kelompok.baris) {
      await db.$executeRaw`
        INSERT INTO "InsentifTransaksi" ("id", "userId", "tanggal", "transactionId", "invoiceNo", "productName", "quantity", "jumlah", "lokasi")
        VALUES (${randomUUID()}, ${kelompok.userId}, ${b.tanggal}, ${b.transactionId}, ${b.invoiceNo}, ${b.productName}, ${b.quantity}, ${b.jumlah}, ${b.lokasi})
      `;
    }
  }

  return {
    ok: true,
    periode,
    totalUserDisinkron: perUser.length,
    totalTransaksi: data.length,
    tidakDicocokkan,
    pesan: `Sinkron selesai: ${perUser.length} karyawan, ${data.length} transaksi (${formatTanggal(tanggalDari)}–${formatTanggal(tanggalSampai)}).${tanpaTanggal > 0 ? ` ${tanpaTanggal} baris tanpa tanggal dilewati.` : ""}`,
  };
}

/** Ambil baris transaksi insentif dalam rentang tanggal (apa adanya). */
export async function ambilInsentifTransaksiRentang(
  dari: string,
  sampai: string,
  cabangId?: string,
): Promise<
  Array<
    BarisInsentifTransaksi & {
      user: {
        id: string;
        name: string;
        username: string | null;
        cabangNama: string | null;
      };
    }
  >
> {
  const rows = await db.$queryRaw<{
    id: string;
    userId: string;
    tanggal: string;
    transactionId: number;
    invoiceNo: string;
    productName: string;
    quantity: number;
    jumlah: number;
    lokasi: string;
    sinkronPada: Date;
    user_id: string;
    user_name: string;
    user_username: string | null;
    cabang_nama: string | null;
  }[]>`
    SELECT t."id", t."userId", t."tanggal", t."transactionId", t."invoiceNo",
      t."productName", t."quantity", t."jumlah", t."lokasi", t."sinkronPada",
      u."id" AS "user_id", u."name" AS "user_name", u."username" AS "user_username",
      c."nama" AS "cabang_nama"
    FROM "InsentifTransaksi" t
    JOIN "User" u ON u."id" = t."userId"
    LEFT JOIN "Cabang" c ON c."id" = u."cabangId"
    WHERE t."tanggal" >= ${dari} AND t."tanggal" <= ${sampai}
      AND (${cabangId === undefined} OR u."cabangId" = ${cabangId ?? ""})
    ORDER BY t."tanggal" ASC, u."name" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    tanggal: r.tanggal,
    transactionId: r.transactionId,
    invoiceNo: r.invoiceNo,
    productName: r.productName,
    quantity: r.quantity,
    jumlah: r.jumlah,
    lokasi: r.lokasi,
    sinkronPada: r.sinkronPada,
    user: {
      id: r.user_id,
      name: r.user_name,
      username: r.user_username,
      cabangNama: r.cabang_nama,
    },
  }));
}

/**
 * Jumlahkan baris transaksi per karyawan (murni, tanpa I/O — bisa diuji).
 * Dipakai halaman Insentif dan Payroll supaya keduanya memakai angka yang
 * sama untuk rentang yang sama.
 */
export function ringkasInsentifPerUser(
  baris: Array<{
    userId: string;
    tanggal: string;
    jumlah: number;
    sinkronPada: Date;
    user: {
      id: string;
      name: string;
      username: string | null;
      cabangNama: string | null;
    };
  }>,
): RingkasanInsentifDenganUser[] {
  const perUser = new Map<string, RingkasanInsentifDenganUser>();
  for (const b of baris) {
    const r = perUser.get(b.userId) ?? {
      userId: b.userId,
      jumlah: 0,
      jumlahTransaksi: 0,
      tanggalAwal: null,
      tanggalAkhir: null,
      sinkronPada: null,
      user: b.user,
    };
    r.jumlah += b.jumlah;
    r.jumlahTransaksi += 1;
    if (!r.tanggalAwal || b.tanggal < r.tanggalAwal) r.tanggalAwal = b.tanggal;
    if (!r.tanggalAkhir || b.tanggal > r.tanggalAkhir) r.tanggalAkhir = b.tanggal;
    if (!r.sinkronPada || b.sinkronPada > r.sinkronPada) r.sinkronPada = b.sinkronPada;
    perUser.set(b.userId, r);
  }
  return [...perUser.values()].sort((a, b) =>
    a.user.name < b.user.name ? -1 : a.user.name > b.user.name ? 1 : 0,
  );
}

/**
 * Jumlahkan insentif per karyawan untuk rentang tanggal (dari baris
 * transaksi tersimpan). Dipakai halaman Insentif (rentang filter) dan
 * Payroll (jendela Dari/Sampai) — keduanya membaca sumber yang sama.
 */
export async function ambilInsentifRentang(
  dari: string,
  sampai: string,
  cabangId?: string,
): Promise<RingkasanInsentifDenganUser[]> {
  const baris = await ambilInsentifTransaksiRentang(dari, sampai, cabangId);
  return ringkasInsentifPerUser(baris);
}

/**
 * Hitung THP dengan menambahkan insentif dari payroll. Mendelegasikan ke
 * rumus kanonik di lib/payroll supaya tidak ada dua rumus THP yang bisa
 * berbeda (mis. saat komponen baru seperti tunjangan makan ditambahkan).
 */
export function takeHomePayDenganInsentif(k: {
  gajiPokok: number;
  tunjangan: number;
  tunjanganMakan: number;
  potonganTelat: number;
  kasbon: number;
  insentif: number;
}): number {
  return takeHomePay(k);
}

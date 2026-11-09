/**
 * API POST /api/insentif/sync
 * Sinkronisasi data insentif dari inox.my.id ke iNox Absensi.
 * Hanya super_admin yang boleh memanggil endpoint ini.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  ambilDataInsentifInox,
  cocokkanUser,
  simpanInsentifPeriode,
} from "@/lib/insentif";
import { periodeValid, rentangPeriode } from "@/lib/rekap";

/** Login ke inox.my.id dan kembalikan cookie jar (string Cookie header). */
async function loginInox(username: string, password: string): Promise<string> {
  const loginPage = await fetch("https://inox.my.id/login", {
    headers: { "User-Agent": "iNox-Absensi-Sync/1.0" },
    cache: "no-store",
  });

  const setCookieLogin = loginPage.headers
    .get("set-cookie")
    ?.split(",")
    .map((c) => c.split(";")[0])
    .join("; ");

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
    redirect: "follow",
    cache: "no-store",
  });

  const setCookieAfterLogin = loginRes.headers
    .get("set-cookie")
    ?.split(",")
    .map((c) => c.split(";")[0])
    .join("; ");

  // Verifikasi login berhasil dengan cek halaman home
  const homeRes = await fetch("https://inox.my.id/home", {
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

/** Ambil rentang tanggal untuk periode "yyyy-mm". */
function rentangTanggalPeriode(periode: string): { dari: string; sampai: string } {
  const [tahun, bulan] = periode.split("-").map(Number);
  const awal = new Date(Date.UTC(tahun, bulan - 1, 1)).toISOString().slice(0, 10);
  const akhir = new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);
  return { dari: awal, sampai: akhir };
}

export async function POST(req: Request): Promise<Response> {
  const sesi = await auth();
  const user = sesi?.user;
  if (!user || user.email === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hanya super_admin boleh sinkron
  const row = await db.user.findUnique({
    where: { id: user.id as string },
    select: { role: true, name: true },
  });
  if (!row || row.role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya super_admin yang boleh sinkron insentif." },
      { status: 403 },
    );
  }

  const INOX_USERNAME = process.env.INOX_USERNAME;
  const INOX_PASSWORD = process.env.INOX_PASSWORD;

  if (!INOX_USERNAME || !INOX_PASSWORD) {
    return NextResponse.json(
      { error: "Kredensial inox.my.id belum diatur di server (INOX_USERNAME / INOX_PASSWORD)." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") || new Date().toISOString().slice(0, 7); // yyyy-mm

  if (!periodeValid(periode)) {
    return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  }

  try {
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

    // 3. Ambil data insentif untuk periode ini
    const { dari, sampai } = rentangTanggalPeriode(periode);
    const data = await ambilDataInsentifInox({
      cookieJar,
      csrfToken,
      startDate: dari,
      endDate: sampai,
    });

    // 4. Ambil semua user untuk matching nama
    const users = await db.user.findMany({
      select: { id: true, name: true },
      where: { aktif: true },
    });

    // 5. Group data insentif per user
    const perUser = new Map<string, { jumlah: number; jumlahTransaksi: number; tanggalAwal?: string; tanggalAkhir?: string }>();
    let tidakDicocokkan = new Set<string>();

    for (const d of data) {
      const userId = cocokkanUser(d.serviceStaff, users);
      if (!userId) {
        tidakDicocokkan.add(d.serviceStaff);
        continue;
      }

      const existing = perUser.get(userId) ?? { jumlah: 0, jumlahTransaksi: 0 };
      existing.jumlah += d.technicianCommissionValue;
      existing.jumlahTransaksi += 1;
      if (!existing.tanggalAwal || d.tanggal < existing.tanggalAwal) {
        existing.tanggalAwal = d.tanggal;
      }
      if (!existing.tanggalAkhir || d.tanggal > existing.tanggalAkhir) {
        existing.tanggalAkhir = d.tanggal;
      }
      perUser.set(userId, existing);
    }

    // 6. Simpan ke database
    const hasil = [];
    for (const [userId, val] of perUser) {
      const simpan = await simpanInsentifPeriode({
        userId,
        periode,
        jumlah: val.jumlah,
        jumlahTransaksi: val.jumlahTransaksi,
        tanggalAwal: val.tanggalAwal ?? null,
        tanggalAkhir: val.tanggalAkhir ?? null,
      });
      hasil.push(simpan);
    }

    return NextResponse.json({
      ok: true,
      periode,
      totalUserDisinkron: hasil.length,
      totalTransaksi: data.length,
      tidakDicocokkan: Array.from(tidakDicocokkan),
      pesan: `Sinkron selesai: ${hasil.length} karyawan, ${data.length} transaksi.`,
    });
  } catch (err: any) {
    console.error("Sinkron insentif gagal:", err);
    return NextResponse.json(
      { error: err?.message ?? "Gagal sinkron insentif." },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

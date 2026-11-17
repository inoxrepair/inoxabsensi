/**
 * API POST /api/insentif/sync-cron
 * Dipanggil cron VPS (bukan manusia): memicu sinkron insentif otomatis
 * 8x sehari. Autentikasi via header x-cron-secret yang dicocokkan dengan
 * CRON_SECRET di environment server — tanpa sesi login, jadi route sinkron
 * biasa (yang butuh super_admin) tidak dipakai di sini.
 * Kunci anti-tabrakan: bila ada sinkron cron yang sedang berjalan, tolak
 * dengan 409 supaya dua proses tidak menghapus-mengisi bersamaan.
 * Periode yang disinkron adalah bulan berjalan (yyyy-mm, zona
 * Asia/Makassar); rentang tanggalnya mengikuti siklus gajian seperti
 * sinkron manual.
 */

import { NextResponse } from "next/server";
import { jalankanSinkronInsentif } from "@/lib/insentif";
import { tanggalLokal } from "@/lib/waktu";

/** Satu sinkron cron dalam satu waktu (proses Node tunggal). */
let sedangSinkron = false;

export async function POST(req: Request): Promise<Response> {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    console.error("Sync-cron ditolak: CRON_SECRET belum diatur di server.");
    return NextResponse.json(
      { error: "CRON_SECRET belum diatur di server." },
      { status: 500 },
    );
  }
  if (req.headers.get("x-cron-secret") !== rahasia) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sedangSinkron) {
    return NextResponse.json(
      { error: "Sinkron insentif sedang berjalan." },
      { status: 409 },
    );
  }

  const periode = tanggalLokal().slice(0, 7); // yyyy-mm, zona Asia/Makassar
  sedangSinkron = true;
  try {
    const hasil = await jalankanSinkronInsentif(periode);
    console.log(`[sync-cron] ${periode}: ${hasil.pesan}`);
    return NextResponse.json(hasil);
  } catch (err) {
    console.error("[sync-cron] gagal:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal sinkron insentif.",
      },
      { status: 500 },
    );
  } finally {
    sedangSinkron = false;
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

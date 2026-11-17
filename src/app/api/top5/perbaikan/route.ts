/**
 * API GET /api/top5/perbaikan
 * Dipanggil tab "Perbaikan" di halaman Top 10 saat tab itu dibuka — data
 * perbaikan TIDAK lagi diambil saat halaman pertama dibuka, supaya
 * kunjungan ke Top 10 lebih ringan. Butuh sesi login (401 bila belum
 * login). Hasilnya memakai cache 5 menit yang sama dengan halaman
 * (lihat top5-data).
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ambilTopPerbaikan } from "@/lib/top5-data";

export async function GET(): Promise<Response> {
  const sesi = await auth();
  if (!sesi?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await ambilTopPerbaikan());
  } catch (err) {
    console.error("[top5/perbaikan] gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat peringkat perbaikan." },
      { status: 500 },
    );
  }
}

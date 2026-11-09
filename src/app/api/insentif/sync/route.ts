/**
 * API POST /api/insentif/sync
 * Sinkronisasi data insentif dari inox.my.id ke iNox Absensi.
 * Hanya super_admin yang boleh memanggil endpoint ini.
 * Logika sinkron tinggal di lib/insentif.ts (jalankanSinkronInsentif)
 * dan dipakai bersama server action, supaya tidak ada panggilan HTTP
 * ke diri sendiri.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { jalankanSinkronInsentif } from "@/lib/insentif";
import { periodeValid } from "@/lib/rekap";

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

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") || new Date().toISOString().slice(0, 7); // yyyy-mm
  const dari = searchParams.get("dari") || undefined;
  const sampai = searchParams.get("sampai") || undefined;

  if (!periodeValid(periode)) {
    return NextResponse.json({ error: "Periode tidak valid." }, { status: 400 });
  }

  try {
    const hasil = await jalankanSinkronInsentif(periode, dari, sampai);
    return NextResponse.json(hasil);
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

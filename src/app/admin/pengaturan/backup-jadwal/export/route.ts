import { db } from "@/lib/db";
import type { BackupJadwal } from "@/lib/backup-jadwal";
import { wajibAkses } from "@/lib/session";
import { selisihHari } from "@/lib/waktu";
import { tanggalValid } from "@/lib/rekap";

export async function GET(request: Request) {
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") return new Response("Forbidden", { status: 403 });
  const q = new URL(request.url).searchParams;
  const dari = q.get("dari") ?? "";
  const sampai = q.get("sampai") ?? "";
  const jumlahHari = selisihHari(dari, sampai) + 1;
  if (!tanggalValid(dari) || !tanggalValid(sampai) || jumlahHari < 1 || jumlahHari > 62) {
    return new Response("Rentang tidak valid", { status: 400 });
  }
  const rows = await db.jadwal.findMany({
    where: { tanggal: { gte: dari, lte: sampai }, shiftId: { not: null } },
    orderBy: [{ tanggal: "asc" }, { user: { name: "asc" } }],
    select: {
      tanggal: true,
      user: { select: { username: true, email: true } },
      shift: { select: { nama: true } },
      jenisSeragam: { select: { kode: true } },
    },
  });
  const backup: BackupJadwal = {
    version: 1,
    dibuatPada: new Date().toISOString(),
    dari,
    sampai,
    data: rows.flatMap((row) => row.shift ? [{
      username: row.user.username,
      email: row.user.email,
      tanggal: row.tanggal,
      shift: row.shift.nama,
      seragamKode: row.jenisSeragam?.kode ?? null,
    }] : []),
  };
  return Response.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="backup-jadwal-${dari}-sd-${sampai}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

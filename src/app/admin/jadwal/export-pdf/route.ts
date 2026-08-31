import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { buatJadwalPdf } from "@/lib/jadwal-pdf";
import { wajibAkses } from "@/lib/session";
import { selisihHari, tanggalGeser } from "@/lib/waktu";

export async function GET(request: Request) {
  const admin = await wajibAkses("jadwal");
  const q = new URL(request.url).searchParams;
  const dari = q.get("dari") ?? "";
  const sampai = q.get("sampai") ?? "";
  const cabangId = roleTerbatasCabang(admin.role)
    ? admin.cabangId
    : q.get("cabang");
  const jumlah = selisihHari(dari, sampai) + 1;
  if (!dari || !sampai || jumlah < 1 || jumlah > 62) {
    return new Response("Rentang tidak valid", { status: 400 });
  }

  const dates = Array.from({ length: jumlah }, (_, i) => tanggalGeser(dari, i));
  const lingkup = cabangId ? { cabangId } : {};
  const [users, schedules, shifts] = await Promise.all([
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...lingkup },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, cabang: { select: { nama: true } } },
    }),
    db.jadwal.findMany({
      where: { tanggal: { in: dates }, user: { aktif: true, ...lingkup } },
    }),
    db.shift.findMany({ orderBy: { mulaiMenit: "asc" } }),
  ]);
  const map = new Map(schedules.map((s) => [`${s.userId}|${s.tanggal}`, s]));
  const rows = users.map((u) => ({
    userId: u.id,
    nama: u.name,
    cabang: u.cabang?.nama ?? "-",
    hari: dates.map((d) => {
      const s = map.get(`${u.id}|${d}`);
      return s?.shiftId
        ? { shiftId: s.shiftId, seragamId: s.seragamId, seragam: s.seragam }
        : null;
    }),
  }));
  const shiftView = shifts.map((s) => ({
    id: s.id,
    nama: s.nama,
    mulai: "",
    selesai: "",
  }));
  const pdf = await buatJadwalPdf({
    dates,
    rows,
    shifts: shiftView,
    title: cabangId ? `Jadwal Shift Cabang` : "Jadwal Shift Semua Cabang",
  });

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jadwal-${dari}-sd-${sampai}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

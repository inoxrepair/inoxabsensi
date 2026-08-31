import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { bacaStatusAbsensi } from "@/lib/domain";
import { ringkas } from "@/lib/absensi";
import { wajibLogin } from "@/lib/session";
import { formatDurasi, durasiMenit, keJam, namaHari, tanggalLokal } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KaryawanRiwayatPage() {
  const sesi = await wajibLogin();
  const tanggal = tanggalLokal();
  // Periode = bulan berjalan; prefix "yyyy-mm" cukup karena tanggal ISO.
  const periode = tanggal.slice(0, 7);

  const baris = await db.absensi.findMany({
    where: { userId: sesi.id, tanggal: { startsWith: periode } },
    orderBy: { tanggal: "desc" },
    select: {
      tanggal: true,
      status: true,
      masukMenit: true,
      keluarMenit: true,
    },
  });

  const total = ringkas(baris.map((b) => bacaStatusAbsensi(b.status)));
  const totalJam = baris.reduce(
    (a, b) =>
      b.masukMenit != null && b.keluarMenit != null
        ? a + durasiMenit(b.masukMenit, b.keluarMenit)
        : a,
    0,
  );

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Riwayat Absensi</h1>
      <p className="mt-1 text-sm text-muted">
        Periode {formatTanggal(`${periode}-01`).replace(/^\d+ /, "")} ·{" "}
        {formatDurasi(totalJam)} tercatat
      </p>

      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Hadir", value: total.hadir },
          { label: "Telat", value: total.telat },
          { label: "Izin", value: total.izin },
          { label: "Alpa", value: total.alpa },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-paper p-3"
          >
            <p className="text-lg font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {baris.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-paper p-8 text-center">
          <p className="text-sm font-medium">Belum ada catatan bulan ini</p>
          <p className="mt-1 text-sm text-muted">
            Riwayat akan muncul setelah Anda melakukan absen masuk.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-paper">
          {baris.map((r) => (
            <li
              key={r.tanggal}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {namaHari(r.tanggal, true)}, {formatTanggal(r.tanggal)}
                </p>
                <p className="text-xs tabular-nums text-muted">
                  {r.masukMenit != null
                    ? `${keJam(r.masukMenit)} – ${
                        r.keluarMenit != null ? keJam(r.keluarMenit) : "belum keluar"
                      }`
                    : "—"}
                </p>
              </div>
              <StatusBadge status={bacaStatusAbsensi(r.status)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

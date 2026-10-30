import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { bacaStatusAbsensi } from "@/lib/domain";
import { ringkas } from "@/lib/absensi";
import { wajibLogin } from "@/lib/session";
import { formatDurasi, durasiMenit, keJam, namaHari, tanggalLokal } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";
import { labelPeriode, periodeTerakhir, periodeValid } from "@/lib/rekap";

export const dynamic = "force-dynamic";

export default async function KaryawanRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const sesi = await wajibLogin();
  const tanggal = tanggalLokal();
  const q = await searchParams;
  // Default bulan berjalan; pilihan lain hanya dari daftar 12 bulan
  // terakhir yang valid, dan query selalu dibatasi ke user yang login.
  const periode =
    q.periode && periodeValid(q.periode) ? q.periode : tanggal.slice(0, 7);
  const daftarPeriode = periodeTerakhir(tanggal.slice(0, 7), 12);

  const baris = await db.absensi.findMany({
    where: { userId: sesi.id, tanggal: { startsWith: periode } },
    orderBy: { tanggal: "desc" },
    select: {
      tanggal: true,
      status: true,
      masukMenit: true,
      keluarMenit: true,
      cycles: { orderBy: { urutan: "asc" }, select: { id: true, urutan: true, masukMenit: true, keluarMenit: true } },
    },
  });

  const total = ringkas(baris.map((b) => bacaStatusAbsensi(b.status)));
  const totalJam = baris.reduce(
    (a, b) =>
      a + (b.cycles.length
        ? b.cycles.reduce((jumlah, cycle) => jumlah + (cycle.keluarMenit == null ? 0 : durasiMenit(cycle.masukMenit, cycle.keluarMenit)), 0)
        : b.masukMenit != null && b.keluarMenit != null
          ? durasiMenit(b.masukMenit, b.keluarMenit)
          : 0),
    0,
  );

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Riwayat Absensi</h1>
      <p className="mt-1 text-sm text-muted">
        Periode {labelPeriode(periode)} · {formatDurasi(totalJam)} tercatat
      </p>
      <form method="get" className="mt-4 flex items-center gap-2">
        <label htmlFor="periode-riwayat" className="text-xs text-muted">
          Bulan
        </label>
        <select
          id="periode-riwayat"
          name="periode"
          defaultValue={periode}
          className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
        >
          {daftarPeriode.map((p) => (
            <option key={p} value={p}>
              {labelPeriode(p)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
        >
          Tampilkan
        </button>
      </form>

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
          <p className="text-sm font-medium">Belum ada catatan pada {labelPeriode(periode)}</p>
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
                <div className="text-xs tabular-nums text-muted">
                  {(r.cycles.length
                    ? r.cycles
                    : r.masukMenit != null
                      ? [{ id: r.tanggal, urutan: 1, masukMenit: r.masukMenit, keluarMenit: r.keluarMenit }]
                      : []).map((cycle) => (
                    <p key={cycle.id}>Cycle {cycle.urutan}: {keJam(cycle.masukMenit)} – {cycle.keluarMenit != null ? keJam(cycle.keluarMenit) : "belum keluar"}</p>
                  ))}
                </div>
              </div>
              <StatusBadge status={bacaStatusAbsensi(r.status)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

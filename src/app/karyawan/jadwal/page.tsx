import { Pill } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { wajibLogin } from "@/lib/session";
import {
  awalMinggu,
  keJam,
  namaHari,
  tanggalGeser,
  tanggalLokal,
} from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KaryawanJadwalPage() {
  const sesi = await wajibLogin();
  const hariIni = tanggalLokal();
  const senin = awalMinggu(hariIni);
  const minggu = Array.from({ length: 7 }, (_, i) => tanggalGeser(senin, i));
  const seninDepan = tanggalGeser(senin, 7);
  const mingguDepan = Array.from({ length: 7 }, (_, i) => tanggalGeser(seninDepan, i));

  const jadwal = await db.jadwal.findMany({
    where: { userId: sesi.id, tanggal: { in: [...minggu, ...mingguDepan] } },
    select: {
      tanggal: true,
      seragam: true,
      jenisSeragam: { select: { nama: true } },
      shift: true,
    },
  });

  const perTanggal = new Map(jadwal.map((j) => [j.tanggal, j]));
  const adaJadwal = (daftar: string[]) => daftar.some((tgl) => perTanggal.has(tgl));

  function daftarMinggu(daftar: string[]) {
    return (
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
        {daftar.map((tgl) => {
          const j = perTanggal.get(tgl);
          const iniHariIni = tgl === hariIni;

          return (
            <li
              key={tgl}
              aria-current={iniHariIni ? "date" : undefined}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                iniHariIni ? "bg-surface/60" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {namaHari(tgl)}{" "}
                  <span className="text-xs font-normal text-muted tabular-nums">
                    {formatTanggal(tgl)}
                  </span>
                  {iniHariIni ? (
                    <span className="ml-2 text-xs font-normal text-muted">
                      hari ini
                    </span>
                  ) : null}
                </p>
                <p className="text-xs tabular-nums text-muted">
                  {j?.shift
                    ? j.shift.mode === "fleksibel"
                       ? `Jam aktual · maksimal ${j.shift.maksimalCycle} cycle`
                      : `${keJam(j.shift.mulaiMenit)}–${keJam(j.shift.selesaiMenit)}`
                    : "Libur"}
                  {j?.jenisSeragam?.nama || j?.seragam
                    ? ` · ${j.jenisSeragam?.nama ?? j.seragam}`
                    : ""}
                </p>
              </div>
              {j?.shift ? (
                <Pill>{j.shift.nama}</Pill>
              ) : (
                <Pill tone="redup">Libur</Pill>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Jadwal Saya</h1>

      <h2 className="mt-5 text-sm font-semibold">Minggu ini</h2>
      <p className="mt-1 text-sm text-muted">
        Minggu {formatTanggal(senin)} – {formatTanggal(minggu[6])}
      </p>
      {daftarMinggu(minggu)}
      {adaJadwal(minggu) ? null : (
        <p className="mt-4 rounded-xl bg-surface px-3.5 py-3 text-center text-xs text-muted">
          Belum ada jadwal yang disusun admin untuk minggu ini.
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold">Minggu depan (bayangan)</h2>
      <p className="mt-1 text-sm text-muted">
        Minggu {formatTanggal(seninDepan)} – {formatTanggal(mingguDepan[6])}
      </p>
      <p className="mt-1 text-xs text-muted">
        Bayangan — jadwal ini masih bisa berubah.
      </p>
      {daftarMinggu(mingguDepan)}
      {adaJadwal(mingguDepan) ? null : (
        <p className="mt-4 rounded-xl bg-surface px-3.5 py-3 text-center text-xs text-muted">
          Belum ada jadwal bayangan untuk minggu depan.
        </p>
      )}
    </>
  );
}

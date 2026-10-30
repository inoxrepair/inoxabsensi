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

  const jadwal = await db.jadwal.findMany({
    where: { userId: sesi.id, tanggal: { in: minggu } },
    select: {
      tanggal: true,
      seragam: true,
      jenisSeragam: { select: { nama: true } },
      shift: true,
    },
  });

  const perTanggal = new Map(jadwal.map((j) => [j.tanggal, j]));

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Jadwal Saya</h1>
      <p className="mt-1 text-sm text-muted">
        Minggu {formatTanggal(senin)} – {formatTanggal(minggu[6])}
      </p>

      <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-paper">
        {minggu.map((tgl) => {
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

      {jadwal.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface px-3.5 py-3 text-center text-xs text-muted">
          Belum ada jadwal yang disusun admin untuk minggu ini.
        </p>
      ) : null}
    </>
  );
}

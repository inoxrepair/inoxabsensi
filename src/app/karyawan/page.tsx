import { StatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { bacaStatusAbsensi } from "@/lib/domain";
import { wajibLogin } from "@/lib/session";
import { keJam, menitLokal, namaHari, tanggalLokal } from "@/lib/waktu";
import { TombolAbsen } from "./tombol-absen";

export const dynamic = "force-dynamic";

function sapaan(menit: number) {
  if (menit < 660) return "Selamat pagi";
  if (menit < 900) return "Selamat siang";
  if (menit < 1080) return "Selamat sore";
  return "Selamat malam";
}

export default async function KaryawanAbsenPage() {
  const sesi = await wajibLogin();
  const tanggal = tanggalLokal();

  const [user, jadwal, absensi] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: sesi.id },
      select: { name: true, jabatan: true, cabang: true },
    }),
    db.jadwal.findUnique({
      where: { userId_tanggal: { userId: sesi.id, tanggal } },
      select: { seragam: true, shift: true },
    }),
    db.absensi.findUnique({
      where: { userId_tanggal: { userId: sesi.id, tanggal } },
      select: { status: true, masukMenit: true, keluarMenit: true },
    }),
  ]);

  const shift = jadwal?.shift ?? null;
  const status = absensi ? bacaStatusAbsensi(absensi.status) : null;

  const mode =
    absensi?.keluarMenit != null
      ? "selesai"
      : absensi?.masukMenit != null
        ? "keluar"
        : "masuk";

  return (
    <>
      <header>
        <p className="text-sm text-muted">{sapaan(menitLokal())},</p>
        <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {user.jabatan} · {user.cabang?.nama ?? "Belum ditempatkan"}
        </p>
      </header>

      <section className="mt-5 rounded-xl border border-line bg-paper p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              {namaHari(tanggal)} · Shift hari ini
            </p>
            <p className="mt-1 font-medium">
              {shift
                ? `${shift.nama} · ${keJam(shift.mulaiMenit)}–${keJam(shift.selesaiMenit)}`
                : "Tidak ada jadwal"}
            </p>
          </div>
          {status ? <StatusBadge status={status} /> : null}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-muted">Masuk</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {absensi?.masukMenit != null ? keJam(absensi.masukMenit) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Keluar</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {absensi?.keluarMenit != null ? keJam(absensi.keluarMenit) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Seragam</dt>
            <dd className="mt-0.5 font-medium">{jadwal?.seragam ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Radius cabang</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {user.cabang ? `${user.cabang.radiusMeter} m` : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <TombolAbsen mode={mode} />

      <p className="mt-3 text-center text-xs text-muted">
        Lokasi diverifikasi terhadap koordinat cabang saat tombol ditekan.
      </p>
    </>
  );
}

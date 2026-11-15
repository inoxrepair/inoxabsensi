import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { db } from "@/lib/db";
import { bacaStatusAbsensi } from "@/lib/domain";
import { ambilInformasiAktif } from "@/lib/informasi-data";
import { wajibLogin } from "@/lib/session";
import { formatDurasi, keJam, menitLokal, namaHari, tanggalLokal, durasiMenit } from "@/lib/waktu";
import { AreaAbsen } from "./area-absen";

export const dynamic = "force-dynamic";

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

function sapaan(menit: number) {
  if (menit < 660) return "Selamat pagi";
  if (menit < 900) return "Selamat siang";
  if (menit < 1080) return "Selamat sore";
  return "Selamat malam";
}

export default async function KaryawanAbsenPage() {
  const sesi = await wajibLogin();
  const tanggal = tanggalLokal();

  const [user, jadwal, absensi, informasi] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: sesi.id },
      select: { name: true, jabatan: true, image: true, cabang: true },
    }),
    db.jadwal.findUnique({
      where: { userId_tanggal: { userId: sesi.id, tanggal } },
      select: {
        seragam: true,
        jenisSeragam: { select: { nama: true } },
        shift: true,
      },
    }),
    db.absensi.findUnique({
      where: { userId_tanggal: { userId: sesi.id, tanggal } },
       select: { status: true, masukMenit: true, keluarMenit: true, maksimalCycle: true, cycles: { orderBy: { urutan: "asc" } } },
    }),
    // Pesan informasi yang tampil hari ini (untuk popup setelah absen masuk).
    ambilInformasiAktif(tanggal),
  ]);

  const shift = jadwal?.shift ?? null;
  const status = absensi ? bacaStatusAbsensi(absensi.status) : null;

  const cycles = absensi?.cycles.length
    ? absensi.cycles
    : absensi?.masukMenit != null
      ? [{ id: "legacy", urutan: 1, masukMenit: absensi.masukMenit, keluarMenit: absensi.keluarMenit }]
      : [];
  const cycleAktif = cycles.find((cycle) => cycle.keluarMenit === null);
  const jumlahCycle = cycles.length;
  const maksimalCycle = absensi?.maksimalCycle ?? (shift?.mode === "fleksibel" ? shift.maksimalCycle : 1) ?? 1;
  // Alasan masuk sudah pasti ditolak server, jadi tombol tidak ditampilkan
  // sama sekali (bukan hanya dinonaktifkan): validasi server tetap berlaku
  // dan tidak berubah; ini hanya mencegah klik yang pasti gagal setelah GPS.
  const alasanMasukDitolak = !shift
    ? "Tidak ada jadwal shift hari ini, jadi tidak bisa absen masuk."
    : status === "izin"
      ? "Anda tercatat izin hari ini, jadi tidak bisa absen masuk."
      : null;
  const mode = cycleAktif
    ? "keluar"
    : jumlahCycle < maksimalCycle
      ? "masuk"
      : "selesai";
  const totalMenit = cycles.reduce(
    (total, cycle) => total + (cycle.keluarMenit == null ? 0 : durasiMenit(cycle.masukMenit, cycle.keluarMenit)),
    0,
  );

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{sapaan(menitLokal())},</p>
          <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {user.jabatan} · {user.cabang?.nama ?? "Belum ditempatkan"}
          </p>
        </div>
        <Link
          href="/karyawan/profil"
          aria-label="Buka profil saya"
          className="shrink-0"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={`Foto profil ${user.name}`}
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-ink text-lg font-medium text-paper"
            >
              {inisial(user.name)}
            </span>
          )}
        </Link>
      </header>

      <LiquidGlass
        variant="regular"
        tint="rgba(255, 255, 255, 0.6)"
        cornerRadius={24}
        className="mt-5 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              {namaHari(tanggal)} · Shift hari ini
            </p>
            <p className="mt-1 font-medium">
              {shift
                ? shift.mode === "fleksibel"
                  ? `${shift.nama} · jam aktual masuk–keluar`
                  : `${shift.nama} · ${keJam(shift.mulaiMenit)}–${keJam(shift.selesaiMenit)}`
                : "Tidak ada jadwal"}
            </p>
            {shift?.mode === "fleksibel" ? (
              <p className="mt-1 text-xs text-muted">
                 Fleksibel · maksimal {maksimalCycle} cycle · tanpa hitung telat
                {shift.minimumKerjaMenit != null
                  ? ` · target ${shift.minimumKerjaMenit / 60} jam`
                  : " · tanpa minimum jam"}
              </p>
            ) : null}
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
            <dd className="mt-0.5 font-medium">
              {jadwal?.jenisSeragam?.nama ?? jadwal?.seragam ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Radius cabang</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {user.cabang ? `${user.cabang.radiusMeter} m` : "—"}
            </dd>
          </div>
        </dl>
      </LiquidGlass>

      {shift?.mode === "fleksibel" && jumlahCycle > 0 ? (
        <LiquidGlass
          variant="regular"
          tint="rgba(255, 255, 255, 0.6)"
          cornerRadius={24}
          className="mt-3 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Cycle hari ini</p>
            <p className="text-xs tabular-nums text-muted">{jumlahCycle}/{maksimalCycle} digunakan · {formatDurasi(totalMenit)}</p>
          </div>
          <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="flex justify-between gap-3 tabular-nums">
                <span>Cycle {cycle.urutan}</span>
                <span className="text-muted">
                  {keJam(cycle.masukMenit)} – {cycle.keluarMenit == null ? "belum keluar" : keJam(cycle.keluarMenit)}
                </span>
              </li>
            ))}
          </ul>
        </LiquidGlass>
      ) : null}

      {mode === "masuk" && alasanMasukDitolak ? (
        <LiquidGlass
          variant="regular"
          tint="rgba(255, 255, 255, 0.6)"
          cornerRadius={24}
          className="mt-5 px-6 py-6"
        >
          <p role="status" className="text-center text-sm text-muted">
            {alasanMasukDitolak}
          </p>
        </LiquidGlass>
      ) : (
        <AreaAbsen
          mode={mode}
          cycleKe={jumlahCycle + 1}
          maksimalCycle={maksimalCycle}
          mulaiMenit={cycleAktif?.masukMenit ?? null}
          daftar={informasi}
        />
      )}

      <p className="mt-3 text-center text-xs text-muted">
        Lokasi diverifikasi terhadap koordinat cabang saat tombol ditekan.
      </p>
    </>
  );
}

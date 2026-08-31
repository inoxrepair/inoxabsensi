import { StatusBadge } from "@/components/ui/status-badge";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import { wajibAkses } from "@/lib/session";
import { keJam, namaHari, tanggalLokal } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await wajibAkses("dashboard");
  const tanggal = tanggalLokal();

  // Admin cabang hanya melihat cabangnya sendiri.
  const lingkupUser =
    roleTerbatasCabang(admin.role) && admin.cabangId
      ? { cabangId: admin.cabangId }
      : {};

  const [karyawanAktif, jumlahCabang, jadwalHariIni, absensi] =
    await Promise.all([
      db.user.count({
        where: { aktif: true, role: { not: "super_admin" }, ...lingkupUser },
      }),
      db.cabang.count({
        where:
          roleTerbatasCabang(admin.role) && admin.cabangId
            ? { id: admin.cabangId }
            : { aktif: true },
      }),
      db.jadwal.findMany({
        where: {
          tanggal,
          shiftId: { not: null },
          user: { aktif: true, ...lingkupUser },
        },
        select: {
          userId: true,
          seragam: true,
          shift: { select: { nama: true, mode: true, mulaiMenit: true, selesaiMenit: true } },
          user: {
            select: { name: true, cabang: { select: { nama: true } } },
          },
        },
      }),
      db.absensi.findMany({
        where: { tanggal, user: { aktif: true, ...lingkupUser } },
        select: {
          userId: true,
          status: true,
          masukMenit: true,
          keluarMenit: true,
        },
      }),
    ]);

  const petaAbsensi = new Map(absensi.map((a) => [a.userId, a]));

  // Gabungkan jadwal dengan absensi: yang terjadwal tapi belum absen
  // ditampilkan sebagai "belum absen", bukan disembunyikan.
  const baris = jadwalHariIni
    .map((j) => {
      const a = petaAbsensi.get(j.userId);
      return {
        userId: j.userId,
        nama: j.user.name,
        cabang: j.user.cabang?.nama ?? "—",
        shift: j.shift
          ? j.shift.mode === "fleksibel"
            ? `${j.shift.nama} (Fleksibel)`
            : `${j.shift.nama} (${keJam(j.shift.mulaiMenit)}–${keJam(j.shift.selesaiMenit)})`
          : "—",
        masuk: a?.masukMenit ?? null,
        keluar: a?.keluarMenit ?? null,
        status: a ? bacaStatusAbsensi(a.status) : null,
      };
    })
    .sort((x, y) => x.nama.localeCompare(y.nama, "id"));

  const sudahAbsen = baris.filter((b) => b.masuk !== null).length;
  const sedangBekerja = baris.filter(
    (b) => b.masuk !== null && b.keluar === null,
  ).length;
  const telat = baris.filter((b) => b.status === "telat").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${namaHari(tanggal)}, ${formatTanggal(tanggal)}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Karyawan aktif"
          value={karyawanAktif}
          hint={`${jumlahCabang} cabang`}
        />
        <StatCard
          label="Terjadwal hari ini"
          value={baris.length}
          hint={`${karyawanAktif - baris.length} libur`}
        />
        <StatCard
          label="Sudah absen"
          value={`${sudahAbsen}/${baris.length}`}
          hint={`${sedangBekerja} sedang bekerja`}
        />
        <StatCard
          label="Telat hari ini"
          value={telat}
          hint={telat === 0 ? "Semua tepat waktu" : "Melewati toleransi shift"}
        />
      </div>

      <div className="mt-6">
        <Card
          title="Absensi hari ini"
          footer={
            baris.length === 0
              ? "Tidak ada karyawan terjadwal hari ini."
              : "Hanya karyawan yang punya jadwal shift hari ini yang ditampilkan."
          }
        >
          {baris.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Belum ada jadwal untuk tanggal ini. Susun di menu Jadwal Shift.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Daftar absensi karyawan hari ini
                </caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Nama
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Cabang
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Shift
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Masuk
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Keluar
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((row) => (
                    <tr key={row.userId} className="border-b border-line/70">
                      <th
                        scope="row"
                        className="py-2.5 pr-4 text-left font-medium"
                      >
                        {row.nama}
                      </th>
                      <td className="py-2.5 pr-4 text-muted">{row.cabang}</td>
                      <td className="py-2.5 pr-4 text-muted">{row.shift}</td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {row.masuk !== null ? keJam(row.masuk) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {row.keluar !== null ? keJam(row.keluar) : "—"}
                      </td>
                      <td className="py-2.5">
                        {row.status ? (
                          <StatusBadge status={row.status} />
                        ) : (
                          <span className="text-xs text-muted">Belum absen</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

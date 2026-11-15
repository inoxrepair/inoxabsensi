import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { bacaStatusAbsensi, roleTerbatasCabang } from "@/lib/domain";
import { menuDiizinkan, wajibAkses } from "@/lib/session";
import { keJam, namaHari, tanggalLokal } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";

export const dynamic = "force-dynamic";

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

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
            select: {
              name: true,
              image: true,
              cabang: { select: { nama: true } },
            },
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
          cycles: { orderBy: { urutan: "asc" }, select: { masukMenit: true, keluarMenit: true } },
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
        foto: j.user.image,
        cabang: j.user.cabang?.nama ?? "—",
        shift: j.shift
          ? j.shift.mode === "fleksibel"
            ? `${j.shift.nama} (Fleksibel)`
            : `${j.shift.nama} (${keJam(j.shift.mulaiMenit)}–${keJam(j.shift.selesaiMenit)})`
          : "—",
         masuk: a?.cycles[0]?.masukMenit ?? a?.masukMenit ?? null,
         keluar: a?.cycles.at(-1)?.keluarMenit ?? a?.keluarMenit ?? null,
         sedangBekerja: a?.cycles.some((cycle) => cycle.keluarMenit === null) ?? (a?.masukMenit != null && a?.keluarMenit == null),
         jumlahCycle: a?.cycles.length ?? (a?.masukMenit != null ? 1 : 0),
        status: a ? bacaStatusAbsensi(a.status) : null,
      };
    })
    .sort((x, y) => x.nama.localeCompare(y.nama, "id"));

  // Badge izin pending hanya untuk role yang bisa membuka /admin/izin
  // (kunci menu "karyawan"); headstore tidak punya kunci itu.
  const punyaMenuIzin = (await menuDiizinkan(admin.role)).has("karyawan");
  const izinPending = punyaMenuIzin
    ? await db.pengajuanIzin.count({
        where: { status: "pending", user: { aktif: true, ...lingkupUser } },
      })
    : 0;

  const sudahAbsen = baris.filter((b) => b.masuk !== null).length;
  const sedangBekerja = baris.filter(
    (b) => b.sedangBekerja,
  ).length;
  const telat = baris.filter((b) => b.status === "telat").length;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {`${namaHari(tanggal)}, ${formatTanggal(tanggal)}`}
          </p>
        </div>
        {admin.role === "headstore" ? (
          <Link href="/karyawan" className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-4 py-2.5 text-sm font-medium">
            Buka absensi saya
          </Link>
        ) : undefined}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Karyawan aktif</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{karyawanAktif}</p>
            <p className="mt-1 text-xs text-muted">{`${jumlahCabang} cabang`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Terjadwal hari ini</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{baris.length}</p>
            <p className="mt-1 text-xs text-muted">{`${karyawanAktif - baris.length} libur`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Sudah absen</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{`${sudahAbsen}/${baris.length}`}</p>
            <p className="mt-1 text-xs text-muted">{`${sedangBekerja} sedang bekerja`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Telat hari ini</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{telat}</p>
            <p className="mt-1 text-xs text-muted">{telat === 0 ? "Semua tepat waktu" : "Melewati toleransi shift"}</p>
          </CardContent>
        </Card>
        {punyaMenuIzin ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted">Izin menunggu</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{izinPending}</p>
              <p className="mt-1 text-xs text-muted">{izinPending === 0 ? "Tidak ada pengajuan pending" : "Buka menu Izin untuk memproses"}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Absensi hari ini</CardTitle>
          </CardHeader>
          <CardContent>
            {baris.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                Belum ada jadwal untuk tanggal ini. Susun di menu Jadwal Shift.
              </p>
            ) : (
              <Table>
                <TableCaption>
                  Daftar absensi karyawan hari ini
                </TableCaption>
                <TableHeader>
                  <TableRow className="border-b border-line">
                    <TableHead scope="col">Nama</TableHead>
                    <TableHead scope="col">Cabang</TableHead>
                    <TableHead scope="col">Shift</TableHead>
                    <TableHead scope="col">Masuk</TableHead>
                    <TableHead scope="col">Keluar</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baris.map((row) => (
                    <TableRow key={row.userId}>
                      <th
                        scope="row"
                        className="py-2.5 pr-4 text-left font-medium"
                      >
                        <span className="flex items-center gap-2.5">
                          {row.foto ? (
                            <img
                              src={row.foto}
                              alt={`Foto profil ${row.nama}`}
                              className="size-8 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-paper"
                            >
                              {inisial(row.nama)}
                            </span>
                          )}
                          {row.nama}
                        </span>
                      </th>
                      <TableCell className="text-muted">{row.cabang}</TableCell>
                      <TableCell className="text-muted">{row.shift}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.masuk !== null ? `${keJam(row.masuk)}${row.jumlahCycle > 1 ? ` (${row.jumlahCycle} cycle)` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.keluar !== null ? keJam(row.keluar) : "—"}
                      </TableCell>
                      <TableCell>
                        {row.status ? (
                          <StatusBadge status={row.status} />
                        ) : (
                          <span className="text-xs text-muted">Belum absen</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter>
            {baris.length === 0
              ? "Tidak ada karyawan terjadwal hari ini."
              : "Hanya karyawan yang punya jadwal shift hari ini yang ditampilkan."}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

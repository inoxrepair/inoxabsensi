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
import { forbidden } from "next/navigation";
import { ADMIN_NAV } from "@/lib/nav";
import { LABEL_ROLE, ROLE, bacaRole } from "@/lib/domain";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { keJam } from "@/lib/waktu";
import { DaftarSeragam } from "./seragam";
import { FormLogo } from "./logo-form";
import { FormNamaPerusahaan } from "./nama-perusahaan-form";
import { BackupJadwalPanel } from "./backup-jadwal";
import { CentangHakAkses } from "./hak-akses-form";
import {
  bacaLogoAplikasi,
  bacaNamaPerusahaan,
  bacaVersiLogo,
} from "@/lib/pengaturan";
import { tanggalLokal } from "@/lib/waktu";

/** Hak akses dibaca dari database, jadi perubahan tidak perlu deploy. */
export const dynamic = "force-dynamic";

export default async function AdminPengaturanPage() {
  // Matriks hanya boleh diedit super admin: wajibAkses saja tidak cukup,
  // karena role lain yang diberi "pengaturan" lewat database bisa ikut
  // mengedit matriks dan menaikkan haknya sendiri.
  const admin = await wajibAkses("pengaturan");
  if (admin.role !== "super_admin") forbidden();

  const [izin, shift, seragam, logo, versiLogo, namaPerusahaan] =
    await Promise.all([
      db.rolePermission.findMany(),
      db.shift.findMany({ orderBy: { mulaiMenit: "asc" } }),
      db.jenisSeragam.findMany({
        orderBy: [{ aktif: "desc" }, { nama: "asc" }],
        include: { _count: { select: { jadwal: true } } },
      }),
      bacaLogoAplikasi(),
      bacaVersiLogo(),
      bacaNamaPerusahaan(),
    ]);

  // Set gabungan "role:menu" untuk lookup O(1) saat render matriks.
  const akses = new Set(izin.map((i) => `${bacaRole(i.role)}:${i.menu}`));

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
          <p className="mt-1 text-sm text-muted">
            Role, hak akses menu, dan aturan absensi global.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Hak akses menu</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              Matriks hak akses menu per role
            </TableCaption>
            <TableHeader>
              <TableRow className="border-b border-line">
                <TableHead scope="col">Menu</TableHead>
                {ROLE.map((r) => (
                  <TableHead key={r} scope="col">
                    {LABEL_ROLE[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ADMIN_NAV.map((item) => (
                // Key pakai href, bukan menu: menu "karyawan" dipakai tiga
                // baris (Karyawan, Log Absensi, Izin).
                <TableRow key={item.href}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {item.label}
                  </th>
                  {ROLE.map((r) => {
                    const boleh = akses.has(`${r}:${item.menu}`);
                    return (
                      <TableCell key={r}>
                        <CentangHakAkses
                          key={`${r}:${item.menu}:${boleh}`}
                          role={r}
                          menu={item.menu}
                          label={item.label}
                          diizinkan={boleh}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          {`${izin.length} baris izin aktif di tabel RolePermission. Centang untuk memberi akses, hapus centang untuk mencabut — perubahan langsung berlaku dan sidebar mengikuti.`}
        </CardFooter>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo aplikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <FormLogo adaLogoKustom={logo !== null} versiLogo={versiLogo} />
          </CardContent>
          <CardFooter>
            Logo disimpan di database, jadi ikut backup dan tidak hilang saat container di-rebuild. Ikon aplikasi di home screen HP tidak ikut berubah dari sini.
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Nama perusahaan</CardTitle>
          </CardHeader>
          <CardContent>
            <FormNamaPerusahaan nilaiSaatIni={namaPerusahaan} />
          </CardContent>
          <CardFooter>
            Nama ini dipakai di slip gaji karyawan. Dikosongkan lalu disimpan akan kembali ke nama bawaan.
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Jenis Seragam</CardTitle>
          </CardHeader>
          <CardContent>
            <DaftarSeragam
              rows={seragam.map((s) => ({
                id: s.id,
                kode: s.kode,
                nama: s.nama,
                deskripsi: s.deskripsi,
                aktif: s.aktif,
                dipakai: s._count.jadwal,
              }))}
            />
          </CardContent>
          <CardFooter>
            Seragam yang sudah pernah dipakai jadwal tidak dapat dihapus. Nonaktifkan agar tidak muncul untuk jadwal baru.
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Backup Jadwal</CardTitle>
          </CardHeader>
          <CardContent>
            <BackupJadwalPanel
              defaultDari={tanggalLokal()}
              defaultSampai={tanggalLokal()}
            />
          </CardContent>
          <CardFooter>
            Backup berupa file JSON portable dan tidak disimpan di database. Simpan file ini di tempat aman.
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aturan absensi</CardTitle>
          </CardHeader>
          <CardContent>
          <dl className="divide-y divide-line text-sm">
            {[
              ["Validasi lokasi", "Wajib dalam radius cabang"],
              ["Metode jarak", "Haversine (GPS perangkat)"],
              [
                "Toleransi telat",
                shift.length
                  ? shift
                      .map((s) => `${s.nama} ${s.toleransiMenit}m`)
                      .join(" · ")
                  : "Belum ada shift",
              ],
              ["Absen ganda", "Ditolak dalam shift yang sama"],
              ["Zona waktu", "Asia/Makassar (WITA)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jam shift</CardTitle>
          </CardHeader>
          <CardContent>
          <ul className="space-y-2.5 text-sm">
            {shift.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4">
                <span>{s.nama}</span>
                <span className="tabular-nums text-muted">
                  {keJam(s.mulaiMenit)}–{keJam(s.selesaiMenit)}
                </span>
              </li>
            ))}
          </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

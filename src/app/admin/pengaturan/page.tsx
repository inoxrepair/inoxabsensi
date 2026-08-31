import { Card, PageHeader } from "@/components/ui/primitives";
import { ADMIN_NAV } from "@/lib/nav";
import { LABEL_ROLE, ROLE, bacaRole } from "@/lib/domain";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { keJam } from "@/lib/waktu";
import { DaftarSeragam } from "./seragam";
import { BackupJadwalPanel } from "./backup-jadwal";
import { tanggalLokal } from "@/lib/waktu";

/** Hak akses dibaca dari database, jadi perubahan tidak perlu deploy. */
export const dynamic = "force-dynamic";

export default async function AdminPengaturanPage() {
  await wajibAkses("pengaturan");

  const [izin, shift, seragam] = await Promise.all([
    db.rolePermission.findMany(),
    db.shift.findMany({ orderBy: { mulaiMenit: "asc" } }),
    db.jenisSeragam.findMany({
      orderBy: [{ aktif: "desc" }, { nama: "asc" }],
      include: { _count: { select: { jadwal: true } } },
    }),
  ]);

  // Set gabungan "role:menu" untuk lookup O(1) saat render matriks.
  const akses = new Set(izin.map((i) => `${bacaRole(i.role)}:${i.menu}`));

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Role, hak akses menu, dan aturan absensi global."
      />

      <Card
        title="Hak akses menu"
        footer={`${izin.length} baris izin aktif di tabel RolePermission. Ubah di database, tampilan langsung ikut.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Matriks hak akses menu per role
            </caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Menu
                </th>
                {ROLE.map((r) => (
                  <th
                    key={r}
                    scope="col"
                    className="py-2 pr-4 font-medium last:pr-0"
                  >
                    {LABEL_ROLE[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_NAV.map((item) => (
                <tr key={item.menu} className="border-b border-line/70">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {item.label}
                  </th>
                  {ROLE.map((r) => {
                    const boleh = akses.has(`${r}:${item.menu}`);
                    return (
                      <td key={r} className="py-2.5 pr-4 last:pr-0">
                        <span className="sr-only">
                          {boleh ? "Diizinkan" : "Tidak diizinkan"}
                        </span>
                        <span aria-hidden="true" className="text-muted">
                          {boleh ? "Ya" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6">
        <Card
          title="Jenis Seragam"
          footer="Seragam yang sudah pernah dipakai jadwal tidak dapat dihapus. Nonaktifkan agar tidak muncul untuk jadwal baru."
        >
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
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Backup Jadwal"
          footer="Backup berupa file JSON portable dan tidak disimpan di database. Simpan file ini di tempat aman."
        >
          <BackupJadwalPanel
            defaultDari={tanggalLokal()}
            defaultSampai={tanggalLokal()}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Aturan absensi">
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
        </Card>

        <Card title="Jam shift">
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
        </Card>
      </div>
    </>
  );
}

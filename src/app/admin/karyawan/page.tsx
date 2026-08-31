import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { bacaRole } from "@/lib/domain";
import { wajibAkses } from "@/lib/session";
import {
  DaftarKaryawan,
  type BarisKaryawan,
  type CabangOption,
} from "./daftar-karyawan";

export const dynamic = "force-dynamic";

export default async function AdminKaryawanPage() {
  const admin = await wajibAkses("karyawan");

  // Admin cabang hanya menerima target di cabangnya. Super admin melihat
  // semua akun, termasuk akun super admin untuk pemeliharaan profil.
  const lingkup =
    admin.role === "admin_cabang" && admin.cabangId
      ? { cabangId: admin.cabangId, role: "karyawan" }
      : {};

  const [karyawan, cabangRows] = await Promise.all([
    db.user.findMany({
      where: lingkup,
      orderBy: [{ aktif: "desc" }, { name: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        jabatan: true,
        role: true,
        tanggalMasuk: true,
        aktif: true,
        cabangId: true,
        cabang: { select: { nama: true } },
      },
    }),
    db.cabang.findMany({
      where:
        admin.role === "admin_cabang"
          ? { id: admin.cabangId ?? "-" }
          : { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const rows: BarisKaryawan[] = karyawan.map((k) => ({
    id: k.id,
    username: k.username ?? "",
    nama: k.name,
    email: k.email,
    jabatan: k.jabatan,
    cabangId: k.cabangId,
    cabang: k.cabang?.nama ?? "Semua cabang",
    role: bacaRole(k.role),
    tanggalMasuk: k.tanggalMasuk,
    aktif: k.aktif,
  }));

  const cabang: CabangOption[] = cabangRows;
  const aktif = rows.filter((r) => r.aktif).length;

  return (
    <>
      <PageHeader
        title="Karyawan"
        description={`${rows.length} akun terdaftar · ${aktif} aktif. Kelola profil, role, cabang, dan password.`}
      />

      <DaftarKaryawan
        rows={rows}
        cabang={cabang}
        adminRole={admin.role}
        adminCabangId={admin.cabangId}
      />
    </>
  );
}

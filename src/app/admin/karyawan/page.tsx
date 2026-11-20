import { db } from "@/lib/db";
import { bacaRole } from "@/lib/domain";
import { petaDapatTunjanganMakan } from "@/lib/karyawan";
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

  const [karyawan, cabangRows, petaMakan] = await Promise.all([
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
        image: true,
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
    // Flag tunjangan makan per karyawan (kolom User baru, via SQL
    // mentah — lihat src/lib/karyawan.ts).
    petaDapatTunjanganMakan(),
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
    dapatTunjanganMakan: petaMakan.get(k.id) ?? true,
    foto: k.image,
  }));

  const cabang: CabangOption[] = cabangRows;
  const aktif = rows.filter((r) => r.aktif).length;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Karyawan</h1>
          <p className="mt-1 text-sm text-muted">
            {`${rows.length} akun terdaftar · ${aktif} aktif. Kelola profil, role, cabang, dan password.`}
          </p>
        </div>
      </header>

      <DaftarKaryawan
        rows={rows}
        cabang={cabang}
        adminRole={admin.role}
        adminCabangId={admin.cabangId}
      />
    </>
  );
}

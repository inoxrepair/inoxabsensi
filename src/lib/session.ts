import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bacaRole, type MenuAdmin, type RoleKaryawan } from "@/lib/domain";

export type Pengguna = {
  id: string;
  nama: string;
  email: string;
  role: RoleKaryawan;
  cabangId: string | null;
  jabatan: string;
};

/**
 * Ambil pengguna sesi. Proxy sudah menjaga route, helper ini memastikan
 * server component tidak pernah merender dengan sesi kosong.
 */
export async function wajibLogin(): Promise<Pengguna> {
  const sesi = await auth();
  const u = sesi?.user;
  if (!u?.email) redirect("/login");

  // JWT menghindari query sesi di proxy, tetapi atribut otorisasi dapat
  // berubah lewat menu Karyawan. Baca ulang user di lapisan server agar
  // perubahan role/cabang dan status nonaktif berlaku pada request berikutnya.
  const row = await db.user.findUnique({
    where: { id: u.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      cabangId: true,
      jabatan: true,
      aktif: true,
    },
  });
  if (!row?.aktif) redirect("/login");

  return {
    id: row.id,
    nama: row.name,
    email: row.email,
    role: bacaRole(row.role),
    cabangId: row.cabangId,
    jabatan: row.jabatan,
  };
}

/** Daftar menu admin yang boleh diakses sebuah role. */
export async function menuDiizinkan(role: RoleKaryawan): Promise<Set<string>> {
  const izin = await db.rolePermission.findMany({
    where: { role },
    select: { menu: true },
  });
  return new Set(izin.map((i) => i.menu));
}

/**
 * Autorisasi per menu berdasarkan tabel RolePermission.
 * Dipakai di setiap halaman admin; proxy hanya memblokir role karyawan.
 */
export async function wajibAkses(menu: MenuAdmin): Promise<Pengguna> {
  const user = await wajibLogin();
  const izin = await menuDiizinkan(user.role);
  if (!izin.has(menu)) forbidden();
  return user;
}

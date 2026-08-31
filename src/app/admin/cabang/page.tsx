import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { wajibAkses } from "@/lib/session";
import { DaftarCabang, type Cabang } from "./daftar-cabang";

export const dynamic = "force-dynamic";

export default async function AdminCabangPage() {
  await wajibAkses("cabang");

  // _count menghindari query N+1 untuk jumlah karyawan per cabang.
  const rows = await db.cabang.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { karyawan: { where: { aktif: true } } } } },
  });

  const cabang: Cabang[] = rows.map(({ _count, ...c }) => ({
    id: c.id,
    nama: c.nama,
    kota: c.kota,
    lat: c.lat,
    lng: c.lng,
    radiusMeter: c.radiusMeter,
    aktif: c.aktif,
    jumlahKaryawan: _count.karyawan,
  }));

  return (
    <>
      <PageHeader
        title="Cabang"
        description="Titik koordinat dan radius yang dipakai memvalidasi absensi karyawan."
      />

      <DaftarCabang cabang={cabang} />

      <p className="mt-4 text-xs text-muted">
        Radius dihitung dari koordinat cabang memakai formula Haversine. Cabang
        yang sudah punya riwayat absensi tidak dihapus, hanya dinonaktifkan.
      </p>
    </>
  );
}

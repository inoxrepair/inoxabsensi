import { DataTable, type Kolom } from "@/components/ui/data-table";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { LABEL_KASBON } from "@/lib/domain";
import { sisaKasbon } from "@/lib/kasbon";
import { formatRupiah } from "@/lib/format";
import { wajibAkses } from "@/lib/session";
import { formatTanggal } from "@/lib/format";
import { ProsesKasbonButtons } from "./buttons";

export const dynamic = "force-dynamic";

type Baris = {
  id: string;
  nama: string;
  cabang: string;
  jumlah: number;
  jumlahTerbayar: number;
  periode: string;
  keterangan: string | null;
  status: string;
  createdAt: string;
};

const kolom: Kolom<Baris>[] = [
  { header: "Karyawan", cell: (r) => r.nama, rowHeader: true },
  { header: "Cabang", cell: (r) => <span className="text-muted">{r.cabang}</span> },
  { header: "Jumlah", cell: (r) => formatRupiah(r.jumlah), numeric: true },
  { header: "Terbayar", cell: (r) => formatRupiah(r.jumlahTerbayar), numeric: true },
  { header: "Sisa", cell: (r) => formatRupiah(Math.max(0, r.jumlah - r.jumlahTerbayar)), numeric: true },
  { header: "Periode", cell: (r) => <span className="tabular-nums">{r.periode}</span> },
  { header: "Keterangan", cell: (r) => <span className="text-muted">{r.keterangan ?? "—"}</span> },
  { header: "Status", cell: (r) => <span className="font-medium">{LABEL_KASBON[r.status as keyof typeof LABEL_KASBON] ?? r.status}</span> },
  { header: "Diajukan", cell: (r) => <span className="tabular-nums text-muted">{formatTanggal(r.createdAt)}</span> },
  { header: "Aksi", cell: (r) => <ProsesKasbonButtons id={r.id} status={r.status} jumlah={r.jumlah} jumlahTerbayar={r.jumlahTerbayar} /> },
];

export default async function AdminKasbonPage() {
  const admin = await wajibAkses("kasbon");
  const lingkup = admin.role !== "super_admin" && admin.cabangId ? { user: { cabangId: admin.cabangId } } : {};
  const catatan = await db.kasbon.findMany({
    where: lingkup,
    orderBy: [{ createdAt: "desc" }],
    include: { user: { select: { name: true, cabang: { select: { nama: true } } } } },
  });

  const baris: Baris[] = catatan.map((c) => ({
    id: c.id,
    nama: c.user.name,
    cabang: c.user.cabang?.nama ?? "—",
    jumlah: c.jumlah,
    jumlahTerbayar: c.jumlahTerbayar,
    periode: c.periode,
    keterangan: c.keterangan,
    status: c.status,
    createdAt: c.createdAt.toISOString().slice(0, 10),
  }));

  const pending = baris.filter((r) => r.status === "pending").length;
  const disetujui = baris.filter((r) => r.status === "disetujui").length;
  const lunas = baris.filter((r) => r.status === "lunas").length;
  // Total aktif hanya sisa kasbon yang disetujui. Yang sudah lunas tidak
  // ikut lagi, dan pembayaran parsial hanya menyisakan selisihnya.
  const total = baris.reduce(
    (a, r) => a + (r.status === "disetujui" ? sisaKasbon(r) : 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Kasbon"
        description="Daftar pengajuan kasbon dari karyawan beserta statusnya."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending} hint="Menunggu approval" />
        <StatCard label="Disetujui" value={disetujui} hint="Sisa akan dipotong payroll" />
        <StatCard label="Lunas" value={lunas} />
        <StatCard label="Total kasbon aktif" value={formatRupiah(total)} hint="Hanya sisa kasbon disetujui" />
      </div>
      <div className="mt-6">
        <Card footer="Admin cabang hanya melihat pengajuan dari cabangnya.">
          <DataTable caption="Daftar kasbon" columns={kolom} rows={baris} rowKey={(r) => r.id} />
        </Card>
      </div>
    </>
  );
}

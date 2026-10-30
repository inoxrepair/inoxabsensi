import Link from "next/link";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
import {
  LABEL_JENIS_IZIN,
  LABEL_STATUS_PENGAJUAN_IZIN,
  bacaJenisIzin,
  bacaStatusPengajuanIzin,
  daftarTanggalIzin,
} from "@/lib/izin";
import { wajibAkses } from "@/lib/session";
import { BuatIzinAdminForm } from "./buat-form";
import { ProsesIzinButtons } from "./buttons";

export const dynamic = "force-dynamic";

const FILTER_STATUS = ["semua", "pending", "disetujui", "ditolak", "dibatalkan"] as const;

export default async function AdminIzinPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await wajibAkses("karyawan");
  const q = await searchParams;
  const filterStatus =
    q.status && FILTER_STATUS.includes(q.status as (typeof FILTER_STATUS)[number]) && q.status !== "semua"
      ? q.status
      : null;

  const lingkupUser =
    roleTerbatasCabang(admin.role) && admin.cabangId
      ? { cabangId: admin.cabangId }
      : {};

  const [pengajuan, karyawan] = await Promise.all([
    db.pengajuanIzin.findMany({
      where: {
        ...(filterStatus ? { status: filterStatus } : {}),
        user: { aktif: true, ...lingkupUser },
      },
      include: {
        user: { select: { name: true, cabang: { select: { nama: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { aktif: true, role: { not: "super_admin" }, ...lingkupUser },
      orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, cabang: { select: { nama: true } } },
    }),
  ]);

  const pending = pengajuan.filter((p) => p.status === "pending").length;
  const disetujui = pengajuan.filter((p) => p.status === "disetujui");

  // Rincian hari disetujui per jenis, dihitung dari hari yang benar-benar
  // punya jadwal shift (hari off yang dilewati saat persetujuan tidak
  // dihitung). Ini rincian di halaman ini saja; total Rekap tidak diubah.
  let hariSakit = 0;
  let hariIzin = 0;
  if (disetujui.length > 0) {
    const dariMin = disetujui.map((p) => p.dari).sort()[0];
    const sampaiMax = disetujui.map((p) => p.sampai).sort().at(-1)!;
    const jadwal = await db.jadwal.findMany({
      where: {
        userId: { in: disetujui.map((p) => p.userId) },
        tanggal: { gte: dariMin, lte: sampaiMax },
        shiftId: { not: null },
      },
      select: { userId: true, tanggal: true },
    });
    const kunci = new Set(jadwal.map((j) => `${j.userId}|${j.tanggal}`));
    for (const p of disetujui) {
      const hari = daftarTanggalIzin(p.dari, p.sampai).filter((t) =>
        kunci.has(`${p.userId}|${t}`),
      ).length;
      if (p.jenis === "sakit") hariSakit += hari;
      else hariIzin += hari;
    }
  }

  return (
    <>
      <PageHeader
        title="Izin"
        description="Pengajuan izin dan sakit karyawan. Persetujuan menandai hari dengan jadwal menjadi izin; hari tanpa jadwal dilewati."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Menunggu persetujuan" value={pending} />
        <StatCard label="Hari sakit disetujui" value={hariSakit} hint="Hanya hari dengan jadwal shift" />
        <StatCard label="Hari izin disetujui" value={hariIzin} hint="Hanya hari dengan jadwal shift" />
        <StatCard label="Total pengajuan" value={pengajuan.length} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {FILTER_STATUS.map((s) => (
          <Link
            key={s}
            href={s === "semua" ? "/admin/izin" : `/admin/izin?status=${s}`}
            className={`rounded-lg border border-line px-3 py-1.5 ${filterStatus === s || (s === "semua" && !filterStatus) ? "bg-ink font-medium text-paper" : "text-muted"}`}
          >
            {s === "semua" ? "Semua" : LABEL_STATUS_PENGAJUAN_IZIN[s as "pending" | "disetujui" | "ditolak" | "dibatalkan"]}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {pengajuan.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-sm text-muted">
            Belum ada pengajuan izin.
          </p>
        ) : (
          pengajuan.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {p.user.name} · {LABEL_JENIS_IZIN[bacaJenisIzin(p.jenis)]} ·{" "}
                    {formatTanggal(p.dari)}
                    {p.sampai !== p.dari ? ` s.d. ${formatTanggal(p.sampai)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {p.user.cabang?.nama ?? "—"} · {p.alasan}
                    {p.buktiKeterangan ? ` · Bukti: ${p.buktiKeterangan}` : ""}
                    {p.catatanAdmin ? ` · Catatan admin: ${p.catatanAdmin}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Status: {LABEL_STATUS_PENGAJUAN_IZIN[bacaStatusPengajuanIzin(p.status)]} · Diajukan{" "}
                    {formatTanggal(p.createdAt.toISOString().slice(0, 10))}
                  </p>
                </div>
                {p.status === "pending" ? (
                  <div className="w-full max-w-xs">
                    <ProsesIzinButtons id={p.id} />
                  </div>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Buat izin langsung</h2>
        <p className="mb-3 text-sm text-muted">
          Untuk kasus mendesak tanpa pengajuan karyawan. Hanya satu tanggal
          yang ada jadwal shift, dan hari yang sudah hadir/telat tidak ditimpa.
        </p>
        <BuatIzinAdminForm
          karyawan={karyawan.map((k) => ({
            id: k.id,
            name: k.name,
            cabang: k.cabang?.nama ?? "—",
          }))}
        />
      </div>
    </>
  );
}

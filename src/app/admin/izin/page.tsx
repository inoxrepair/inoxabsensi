import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { ambilKolomTambahanIzin } from "@/lib/izin-data";
import { wajibAkses } from "@/lib/session";
import { keJam } from "@/lib/waktu";
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
  // Dinas luar tidak dihitung di sini karena ditandai hadir, bukan izin.
  let hariSakit = 0;
  let hariIzin = 0;
  let hariCuti = 0;
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
      else if (p.jenis === "cuti") hariCuti += hari;
      else if (p.jenis === "izin") hariIzin += hari;
    }
  }
  const tambahan = await ambilKolomTambahanIzin(pengajuan.map((p) => p.id));

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Izin</h1>
          <p className="mt-1 text-sm text-muted">
            Pengajuan izin, sakit, cuti, dinas luar, izin telat, dan izin
            pulang cepat. Persetujuan menandai hari dengan jadwal (izin/sakit/cuti
            jadi izin, dinas luar jadi hadir); izin telat/pulang cepat hanya
            menyimpan batas jam untuk absen hari itu.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Menunggu persetujuan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Hari sakit disetujui</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{hariSakit}</p>
            <p className="mt-1 text-xs text-muted">Hanya hari dengan jadwal shift</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Hari izin disetujui</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{hariIzin}</p>
            <p className="mt-1 text-xs text-muted">Hanya hari dengan jadwal shift</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Hari cuti disetujui</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{hariCuti}</p>
            <p className="mt-1 text-xs text-muted">Hanya hari dengan jadwal shift</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Total pengajuan</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{pengajuan.length}</p>
          </CardContent>
        </Card>
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
          <p className="rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-6 text-center text-sm text-muted">
            Belum ada pengajuan izin.
          </p>
        ) : (
          pengajuan.map((p) => {
            const jam = tambahan.get(p.id);
            const jenis = bacaJenisIzin(p.jenis);
            const hari = daftarTanggalIzin(p.dari, p.sampai).length;
            const pesanSetujui =
              jenis === "telat"
                ? "Setujui izin telat ini? Berlaku saat absen masuk hari itu; bila karyawan sudah absen, catatan telatnya diperbaiki."
                : jenis === "pulang-cepat"
                  ? "Setujui izin pulang cepat ini? Berlaku saat absen keluar hari itu; bila karyawan sudah pulang, kekurangannya diperbaiki."
                  : jenis === "cuti"
                    ? `Setujui cuti ini? ${hari} hari ditandai izin dan saldo cuti berkurang ${hari} hari.`
                    : jenis === "dinas"
                      ? "Setujui dinas luar ini? Hari dengan jadwal akan ditandai hadir."
                      : "Setujui pengajuan ini? Hari dengan jadwal akan ditandai izin; hari tanpa jadwal dilewati.";
            return (
            <Card key={p.id}>
              <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {p.user.name} · {LABEL_JENIS_IZIN[jenis]} ·{" "}
                    {formatTanggal(p.dari)}
                    {p.sampai !== p.dari ? ` s.d. ${formatTanggal(p.sampai)}` : ""}
                    {jenis === "telat" && jam?.jamMasukDiizinkan != null
                      ? ` · Boleh masuk s.d. ${keJam(jam.jamMasukDiizinkan)}`
                      : ""}
                    {jenis === "pulang-cepat" && jam?.jamPulangDiizinkan != null
                      ? ` · Boleh pulang mulai ${keJam(jam.jamPulangDiizinkan)}`
                      : ""}
                    {jenis === "cuti" ? ` · ${hari} hari` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {p.user.cabang?.nama ?? "—"} · {p.alasan}
                    {p.buktiKeterangan ? ` · Bukti: ${p.buktiKeterangan}` : ""}
                    {p.catatanAdmin ? ` · Catatan admin: ${p.catatanAdmin}` : ""}
                  </p>
                  {jam?.buktiFoto ? (
                    <a
                      href={jam.buktiFoto}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block w-fit"
                    >
                      <img
                        src={jam.buktiFoto}
                        alt="Foto bukti pengajuan"
                        className="h-20 rounded-lg object-cover"
                      />
                    </a>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    Status: {LABEL_STATUS_PENGAJUAN_IZIN[bacaStatusPengajuanIzin(p.status)]} · Diajukan{" "}
                    {formatTanggal(p.createdAt.toISOString().slice(0, 10))}
                  </p>
                </div>
                {p.status === "pending" ? (
                  <div className="w-full max-w-xs">
                    <ProsesIzinButtons id={p.id} pesanSetujui={pesanSetujui} />
                  </div>
                ) : null}
              </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Buat izin langsung</h2>
        <p className="mb-3 text-sm text-muted">
          Untuk kasus mendesak tanpa pengajuan karyawan. Izin, sakit, cuti,
          dan dinas menandai satu tanggal yang ada jadwal shift; izin telat
          dan izin pulang cepat langsung disetujui dengan batas jam. Hari
          yang sudah hadir/telat tidak ditimpa.
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

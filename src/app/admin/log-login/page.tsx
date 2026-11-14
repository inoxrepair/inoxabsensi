import { DataTable, type Kolom } from "@/components/ui/data-table";
import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatTanggal } from "@/lib/format";
import {
  LABEL_JENIS_LOG_LOGIN,
  perangkatDariAgen,
  tandaiMencurigakan,
  type BarisLogLogin,
} from "@/lib/log-login";
import { ambilLogLogin } from "@/lib/log-login-data";
import { bacaRentang, labelRentang } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { formatJamDetik, tanggalGeser, tanggalLokal } from "@/lib/waktu";
import { FilterLogLogin } from "./filter-log-login";

export const dynamic = "force-dynamic";

const BATAS_BARIS = 2000;

export default async function AdminLogLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    dari?: string;
    sampai?: string;
    cabang?: string;
    karyawan?: string;
    jenis?: string;
  }>;
}) {
  await wajibAkses("log-login");
  const q = await searchParams;
  const hariIni = tanggalLokal();
  // Tanpa rentang: 30 hari terakhir (bukan bulan kalender).
  const rentang =
    q.dari || q.sampai
      ? bacaRentang({ dari: q.dari, sampai: q.sampai }, hariIni.slice(0, 7))
      : { dari: tanggalGeser(hariIni, -29), sampai: hariIni, kustom: true };

  const cabangTerpilih = q.cabang ?? "";
  const karyawanTerpilih = q.karyawan ?? "";
  const jenisTerpilih =
    q.jenis === "masuk" || q.jenis === "keluar" ? q.jenis : "";

  const [semua, cabang, karyawan] = await Promise.all([
    ambilLogLogin(rentang.dari, rentang.sampai),
    db.cabang.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, cabangId: true },
    }),
  ]);

  // Tandai dulu di seluruh rentang (sebelum filter), supaya pola satu
  // perangkat dipakai banyak akun tetap ketahuan walau difilter per karyawan.
  const penanda = tandaiMencurigakan(semua);
  const tampil = semua.filter(
    (r) =>
      (!cabangTerpilih || r.cabangId === cabangTerpilih) &&
      (!karyawanTerpilih || r.userId === karyawanTerpilih) &&
      (!jenisTerpilih || r.jenis === jenisTerpilih),
  );

  const jumlahMasuk = tampil.filter((r) => r.jenis === "masuk").length;
  const jumlahKeluar = tampil.length - jumlahMasuk;
  const jumlahMencurigakan = tampil.filter((r) => penanda.has(r.id)).length;

  const kolom: Kolom<BarisLogLogin>[] = [
    {
      header: "Tanggal",
      cell: (r) => (
        <span className="tabular-nums">
          {formatTanggal(tanggalLokal(r.dibuatPada))}
        </span>
      ),
    },
    {
      header: "Jam",
      cell: (r) => (
        <span className="tabular-nums">{formatJamDetik(r.dibuatPada)}</span>
      ),
    },
    { header: "Karyawan", cell: (r) => r.nama, rowHeader: true },
    {
      header: "Cabang",
      cell: (r) => <span className="text-muted">{r.cabang}</span>,
    },
    {
      header: "Jenis",
      cell: (r) => (
        <span className="font-medium">{LABEL_JENIS_LOG_LOGIN[r.jenis]}</span>
      ),
    },
    {
      header: "Alamat IP",
      cell: (r) => <span className="tabular-nums">{r.ip}</span>,
    },
    {
      header: "Perangkat",
      cell: (r) => (
        <span className="inline-flex flex-col items-start gap-0.5">
          <span>{perangkatDariAgen(r.agen)}</span>
          {r.perangkatId ? (
            <span className="text-xs text-muted tabular-nums">
              ID {r.perangkatId}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r) => {
        const alasan = penanda.get(r.id);
        if (!alasan) return <span className="text-muted">—</span>;
        return (
          <span className="inline-flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center rounded-full bg-status-izin/10 px-2.5 py-0.5 text-xs font-medium text-status-izin ring-1 ring-inset ring-status-izin/25">
              Perlu diperiksa
            </span>
            <span className="text-xs text-muted">{alasan}</span>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Log Login"
        description={`${labelRentang(rentang)} · ${tampil.length} baris`}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Baris" value={tampil.length} />
        <StatCard label="Masuk" value={jumlahMasuk} />
        <StatCard label="Keluar" value={jumlahKeluar} />
        <StatCard label="Perlu diperiksa" value={jumlahMencurigakan} />
      </div>

      <FilterLogLogin
        awal={rentang.dari}
        akhir={rentang.sampai}
        cabang={cabang}
        cabangTerpilih={cabangTerpilih}
        karyawan={karyawan}
        karyawanTerpilih={karyawanTerpilih}
        jenisTerpilih={jenisTerpilih}
      />

      <Card footer="Logout hanya tercatat saat karyawan menekan tombol Keluar; sesi yang habis sendiri tidak menghasilkan baris keluar. IP adalah alamat publik yang terlihat server — satu WiFi kantor berbagi satu IP, jadi perangkat (kolom Perangkat) yang membedakan tiap HP. ID perangkat adalah kode acak yang disimpan di browser HP karyawan — tiap HP punya kode sendiri, sehingga dua iPhone yang User-Agent-nya sama tetap bisa dibedakan; baris lama (sebelum fitur ini) tidak punya ID. Tanda “Perlu diperiksa” berarti pola loginnya janggal dan layak ditanyakan ke karyawan, bukan bukti titip absen.">
        <div className="overflow-x-auto">
          {tampil.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Belum ada login/logout dalam rentang ini.
            </p>
          ) : (
            <DataTable
              caption="Log login"
              columns={kolom}
              rows={tampil}
              rowKey={(r) => r.id}
            />
          )}
        </div>
        {semua.length >= BATAS_BARIS ? (
          <p className="mt-3 text-sm text-muted">
            Batas {BATAS_BARIS} baris tercapai — persempit rentang tanggal
            untuk melihat sisanya.
          </p>
        ) : null}
      </Card>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { labelPeriode } from "@/lib/rekap";
import {
  LABEL_STATUS_SLIP,
  tanggalSlip,
  type BarisSlip,
} from "@/lib/slip-gaji";
import {
  buatSemuaSlip,
  buatSlip,
  tandaiDibayar,
  type HasilSlip,
} from "./actions";

/** Warna lencana status — memakai token status yang sudah ada. */
const GAYA_STATUS: Record<BarisSlip["status"], string> = {
  belum: "bg-white/70 text-muted dark:bg-zinc-900/60",
  dibuat: "bg-status-hadir/10 text-status-hadir",
  dibayar: "bg-ink text-paper",
};

const KOMPONEN_TAMPIL: {
  kunci: keyof BarisSlip["komponen"];
  label: string;
  kurang?: boolean;
}[] = [
  { kunci: "gajiPokok", label: "Gaji pokok" },
  { kunci: "gajiPokokFleksibel", label: "Gaji pokok fleksibel" },
  { kunci: "gajiPokokHarian", label: "Gaji pokok harian" },
  { kunci: "tunjangan", label: "Tunjangan" },
  { kunci: "tunjanganMakan", label: "Tunjangan makan" },
  { kunci: "lembur", label: "Lembur" },
  { kunci: "insentif", label: "Insentif" },
  { kunci: "potonganTelat", label: "Potongan telat", kurang: true },
  { kunci: "kasbon", label: "Kasbon", kurang: true },
];

/** Tabel Daftar Slip satu periode + tombol massal. */
export function TabelSlip({
  periode,
  baris,
  bolehUbah,
  rentang,
}: {
  periode: string;
  baris: BarisSlip[];
  /** false = baca-saja (admin cabang): tanpa tombol Buat/Tandai dibayar. */
  bolehUbah: boolean;
  /** Rentang gajian periode ini (28–27) untuk keterangan dialog. */
  rentang: { dari: string; sampai: string };
}) {
  const [pesan, setPesan] = useState<HasilSlip | null>(null);
  const [menunggu, mulai] = useTransition();

  function jalankan(aksi: (f: FormData) => Promise<HasilSlip>, f: FormData) {
    mulai(async () => setPesan(await aksi(f)));
  }

  function buatSemua() {
    const f = new FormData();
    f.set("periode", periode);
    jalankan(buatSemuaSlip, f);
  }

  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center text-sm text-muted">
        Belum ada karyawan aktif pada lingkup ini.
      </p>
    );
  }

  const jumlahDibuat = baris.filter((r) => r.status !== "belum").length;
  const jumlahDibayar = baris.filter((r) => r.status === "dibayar").length;

  return (
    <div className="space-y-3">
      {pesan ? (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            pesan.ok
              ? "bg-status-hadir/10 text-status-hadir"
              : "bg-status-alpa/10 text-status-alpa"
          }`}
        >
          {pesan.pesan}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {`${jumlahDibuat} dari ${baris.length} slip dibuat · ${jumlahDibayar} sudah dibayar`}
        </p>
        {bolehUbah ? (
          <Button
            type="button"
            size="sm"
            disabled={menunggu || jumlahDibuat === baris.length}
            onClick={buatSemua}
            title="Buat snapshot slip untuk semua karyawan yang belum punya slip periode ini"
          >
            {menunggu ? "Membuat…" : "Buat semua slip periode ini"}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Daftar slip gaji per karyawan</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3 font-medium">Karyawan</th>
              <th className="p-3 font-medium">Status slip</th>
              <th className="p-3 text-right font-medium">Diterima</th>
              <th className="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((r) => (
              <BarisSlip
                key={`${periode}:${r.userId}`}
                periode={periode}
                r={r}
                bolehUbah={bolehUbah}
                rentang={rentang}
                menunggu={menunggu}
                jalankan={jalankan}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        THP yang tampil memakai snapshot yang tersimpan bila slip sudah
        dibuat; bila belum, memakai hitungan payroll saat ini (bisa berubah
        bila data absensi/gaji diubah). Slip PDF dihitung dari payroll saat
        ini — sama seperti tautan Slip PDF di halaman Payroll.
      </p>
    </div>
  );
}

function BarisSlip({
  periode,
  r,
  bolehUbah,
  rentang,
  menunggu,
  jalankan,
}: {
  periode: string;
  r: BarisSlip;
  bolehUbah: boolean;
  rentang: { dari: string; sampai: string };
  menunggu: boolean;
  jalankan: (aksi: (f: FormData) => Promise<HasilSlip>, f: FormData) => void;
}) {
  function buat() {
    const f = new FormData();
    f.set("userId", r.userId);
    f.set("periode", periode);
    jalankan(buatSlip, f);
  }

  function bayar() {
    if (!r.snapshot) return;
    const f = new FormData();
    f.set("id", r.snapshot.id);
    jalankan(tandaiDibayar, f);
  }

  return (
    <tr className="border-b border-line/70 last:border-0">
      <th scope="row" className="p-3 text-left">
        <span className="font-medium">{r.nama}</span>
        <span className="block text-xs font-normal text-muted">{r.cabang}</span>
      </th>
      <td className="p-3">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${GAYA_STATUS[r.status]}`}
        >
          {LABEL_STATUS_SLIP[r.status]}
        </span>
        {r.status === "dibayar" && r.snapshot?.dibayarPada ? (
          <span className="block pt-1 text-xs text-muted">
            {tanggalSlip(r.snapshot.dibayarPada)}
          </span>
        ) : null}
      </td>
      <td className="p-3 text-right font-medium tabular-nums">
        {formatRupiah(r.diterima)}
        {r.dariSnapshot ? null : (
          <span className="block text-xs font-normal text-muted">
            hitungan saat ini
          </span>
        )}
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-2">
          <LihatSlip periode={periode} r={r} rentang={rentang} />
          <a
            href={`/admin/payroll/ekspor?periode=${periode}&karyawan=${r.userId}`}
            className="rounded-lg border border-line px-3 py-1.5 text-center text-xs font-medium"
            title="Unduh slip gaji karyawan ini (PDF)"
          >
            Slip PDF
          </a>
          {bolehUbah && r.status === "belum" ? (
            <Button type="button" size="sm" disabled={menunggu} onClick={buat}>
              Buat slip
            </Button>
          ) : null}
          {bolehUbah && r.status === "dibuat" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={menunggu}
              onClick={bayar}
              title="Tandai slip ini sudah dibayar"
            >
              Tandai dibayar
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Dialog rincian slip — pengecekan cepat tanpa mengunduh PDF. */
function LihatSlip({
  periode,
  r,
  rentang,
}: {
  periode: string;
  r: BarisSlip;
  rentang: { dari: string; sampai: string };
}) {
  const [buka, setBuka] = useState(false);
  const s = r.snapshot;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setBuka(true)}>
        Lihat
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent
          aria-label={`Slip gaji ${r.nama}`}
          className="max-w-md"
        >
          <DialogTitle>
            Slip gaji — {r.nama}
          </DialogTitle>
          <p className="text-sm text-muted">
            {`${labelPeriode(periode)} (${formatTanggal(rentang.dari)}–${formatTanggal(rentang.sampai)}) · ${r.cabang}`}
          </p>
          <p className="text-sm">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${GAYA_STATUS[r.status]}`}
            >
              {LABEL_STATUS_SLIP[r.status]}
            </span>
          </p>
          <dl className="space-y-1.5 text-sm">
            {KOMPONEN_TAMPIL.filter(
              ({ kunci }) =>
                kunci !== "tunjanganMakan" || r.komponen.tunjanganMakan > 0,
            ).map(({ kunci, label, kurang }) => (
              <div key={kunci} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="tabular-nums">
                  {kurang ? "− " : ""}
                  {formatRupiah(r.komponen[kunci])}
                </dd>
              </div>
            ))}
            {r.komponen.penyesuaian !== 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  {r.komponen.penyesuaian > 0 ? "Tambahan" : "Pengurangan"}
                  {r.keteranganPenyesuaian
                    ? ` — ${r.keteranganPenyesuaian}`
                    : null}
                </dt>
                <dd className="tabular-nums">
                  {r.komponen.penyesuaian > 0 ? "+ " : "− "}
                  {formatRupiah(Math.abs(r.komponen.penyesuaian))}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-line pt-2 font-medium">
              <dt>Diterima</dt>
              <dd className="tabular-nums">{formatRupiah(r.diterima)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            {s
              ? `Sesuai snapshot yang tersimpan${s.dibuatPada ? ` pada ${tanggalSlip(s.dibuatPada)}` : ""}${s.dibayarPada ? ` · dibayar ${tanggalSlip(s.dibayarPada)}` : ""}. Tunjangan makan mengikuti pengaturan saat ini.`
              : "Perhitungan saat ini — slip belum dibuat; angka bisa berubah bila data diubah."}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

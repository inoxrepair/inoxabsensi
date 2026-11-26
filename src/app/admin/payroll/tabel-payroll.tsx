"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/format";
import {
  melebihiPendapatan,
  takeHomePay,
  TARIF_LEMBUR_PER_JAM,
  TARIF_PER_JAM,
  TARIF_POTONGAN_TELAT_PER_MENIT,
  TARIF_TUNJANGAN_MAKAN_PER_HARI,
} from "@/lib/payroll";
import { simpanPayroll, type HasilPayroll } from "./actions";
import type { BarisPayroll } from "@/lib/payroll";

const KOMPONEN = [
  ["gajiPokok", "Gaji pokok"],
  ["tunjangan", "Tunjangan"],
  ["kasbon", "Kasbon"],
  ["penyesuaian", "Penyesuaian"],
] as const;

/** Form payroll per karyawan; semua angka tersimpan sekaligus per baris. */
export function TabelPayroll({
  periode,
  baris,
  bolehUbah,
  infoJendela,
  rentangKustom,
}: {
  periode: string;
  baris: BarisPayroll[];
  /** false = angka tampil baca-saja (admin cabang): tanpa input/Simpan. */
  bolehUbah: boolean;
  /** Keterangan bila hitungan hadir/telat dibatasi rentang tanggal kustom. */
  infoJendela?: string;
  /** Rentang kustom aktif (bila ada) — diteruskan ke tautan Slip PDF per baris. */
  rentangKustom?: { dari: string; sampai: string };
}) {
  const [pesan, setPesan] = useState<HasilPayroll | null>(null);

  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center text-sm text-muted">
        Belum ada karyawan aktif pada lingkup ini.
      </p>
    );
  }

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

      <div className="overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl">
        <table className="w-full min-w-[1360px] text-sm">
          <caption className="sr-only">
            {bolehUbah ? "Payroll editable per karyawan" : "Payroll per karyawan"}
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3 font-medium">Karyawan</th>
              {KOMPONEN.map(([, label]) => (
                <th key={label} className="p-3 text-right font-medium">
                  {label}
                </th>
              ))}
              <th className="p-3 text-right font-medium">Potongan</th>
              <th className="p-3 text-right font-medium">Kasbon (sisa)</th>
              <th className="p-3 text-right font-medium">Insentif</th>
              <th className="p-3 text-right font-medium">Tunjangan makan</th>
              <th className="p-3 text-right font-medium">Lembur</th>
              <th className="p-3 text-right font-medium">Diterima</th>
              <th className="p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((r) => (
              // Periode menjadi bagian key agar state input tidak terbawa
              // ketika admin berpindah bulan untuk karyawan yang sama.
              <Baris
                key={`${periode}:${r.userId}`}
                periode={periode}
                awal={r}
                bolehUbah={bolehUbah}
                onPesan={setPesan}
                rentangKustom={rentangKustom}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Nilai disimpan dalam rupiah. Gaji diterima = gaji pokok + gaji pokok
        fleksibel + gaji pokok harian + tunjangan + tunjangan makan + lembur
        + insentif + penyesuaian - potongan - kasbon. Penyesuaian: kolom
        tambahan per karyawan — isi nominal beserta keterangan (mis.
        Potongan BPJS); tombol + Tambah / − Kurang memilih jenisnya,
        karena keyboard angka HP tidak punya tombol minus; keterangan
        wajib bila nominal diisi; baris ini tampil di slip gaji beserta
        keterangannya. Tunjangan makan
        dihitung otomatis {formatRupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} × hari
        hadir (status hadir/telat) pada periode ini; alpa, izin, dan off
        tidak dihitung. Potongan telat dihitung otomatis{" "}
        {formatRupiah(TARIF_POTONGAN_TELAT_PER_MENIT)} × menit telat tercatat
        pada periode ini; menit telat sudah dikurangi toleransi shift, jadi
        ubah toleransi di definisi shift bila perlu (berlaku untuk absen
        berikutnya). Lembur dihitung otomatis{" "}
        {formatRupiah(TARIF_LEMBUR_PER_JAM)} × jam lembur: shift terjadwal di
        atas 8 jam (ikut definisi shift, bukan jam absen nyata), sisa 30
        menit atau lebih dibulatkan ke atas per hari; shift fleksibel tidak
        dihitung lembur. Gaji pokok fleksibel dihitung otomatis{" "}
        {formatRupiah(TARIF_PER_JAM)} × jam kerja hari fleksibel: jumlah
        cycle absen hari itu (1–3 cycle diakumulasi), dibulatkan per hari
        dengan aturan yang sama; ditambahkan ke gaji pokok manual di atas —
        untuk karyawan yang sepenuhnya fleksibel, isi gaji pokok manual 0
        supaya tidak dobel. Gaji pokok harian dihitung otomatis{" "}
        {formatRupiah(TARIF_PER_JAM)} × jam shift biasa: untuk karyawan yang
        gaji pokok manualnya 0, hari shift terjadwal yang hadir/telat
        dibayar penuh sesuai durasi shift (maksimal 8 jam, dibulatkan per
        hari dengan aturan yang sama) — jam masuk-keluar tidak dilihat,
        jadi tidak check-out pun tetap dibayar penuh 1 hari; kalau gaji
        pokok manual diisi, hitungan ini berhenti supaya tidak dobel.
        Insentif berasal dari sinkron inox.my.id (menu Insentif)
        dan mengikuti rentang tanggal yang dipilih di atas; insentif tidak
        bisa diubah di sini. Kasbon yang diajukan (pending) maupun disetujui
        langsung terhitung sebagai potongan bila kolom kasbon belum pernah
        diisi; tombol &quot;Isi kasbon dari
        pengajuan&quot; hanya mengisi kolom, nilai baru tersimpan setelah
        tombol Simpan ditekan.
      </p>
      {infoJendela ? <p className="text-xs text-muted">{infoJendela}</p> : null}
    </div>
  );
}

function Baris({
  periode,
  awal,
  bolehUbah,
  onPesan,
  rentangKustom,
}: {
  periode: string;
  awal: BarisPayroll;
  bolehUbah: boolean;
  onPesan: (h: HasilPayroll) => void;
  rentangKustom?: { dari: string; sampai: string };
}) {
  const [nilai, setNilai] = useState({
    gajiPokok: String(awal.gajiPokok),
    tunjangan: String(awal.tunjangan),
    kasbon: String(awal.kasbon),
    penyesuaian: String(awal.penyesuaian),
    keteranganPenyesuaian: awal.keteranganPenyesuaian ?? "",
  });
  const [menunggu, mulai] = useTransition();

  const angka = {
    gajiPokok: Number(nilai.gajiPokok) || 0,
    // Gaji pokok fleksibel juga read-only: jam kerja hari fleksibel
    // (jumlah cycle, dibulatkan per hari) × Rp 12.000.
    gajiPokokFleksibel: awal.gajiPokokFleksibel,
    // Gaji pokok harian juga read-only: durasi shift hari terjadwal
    // (maksimal 8 jam, dibulatkan per hari) × Rp 12.000 — hanya bila
    // gaji pokok manual 0 (karyawan per-jam).
    gajiPokokHarian: awal.gajiPokokHarian,
    tunjangan: Number(nilai.tunjangan) || 0,
    // Tunjangan makan dibaca (read-only) dari hitungan hari hadir,
    // seperti insentif — bukan dari form.
    tunjanganMakan: awal.tunjanganMakan,
    // Lembur juga read-only: shift terjadwal di atas 8 jam × Rp 12.000.
    lembur: awal.lembur,
    // Potongan telat juga read-only: menit telat tercatat × Rp 1.000.
    potonganTelat: awal.potonganTelat,
    kasbon: Number(nilai.kasbon) || 0,
    // Penyesuaian juga dari form: nominal bertanda (positif = tambahan,
    // negatif = pengurangan).
    penyesuaian: Number(nilai.penyesuaian) || 0,
    // Insentif dibaca (read-only) dari tabel Insentif, bukan dari form.
    insentif: awal.insentif,
  };
  const diterima = takeHomePay(angka);
  const peringatan = melebihiPendapatan(angka);

  const tandaNegatif = nilai.penyesuaian.trim().startsWith("-");
  // Keyboard angka HP tidak punya tombol minus: tombol ＋/− inilah yang
  // membalik tanda nominal penyesuaian (＋ tambahan / − pengurangan).
  function aturTanda(negatif: boolean) {
    setNilai((n) => {
      const angka = (n.penyesuaian || "").replace(/^-/, "");
      if (negatif) {
        return {
          ...n,
          penyesuaian: angka === "" || angka === "0" ? "-" : `-${angka}`,
        };
      }
      return { ...n, penyesuaian: angka === "" ? "0" : angka };
    });
  }

  // Tautan slip gaji karyawan ini (mengikuti periode + rentang kustom
  // yang sedang tampil, supaya angkanya sama dengan baris ini).
  const slipParams = new URLSearchParams({
    periode,
    karyawan: awal.userId,
  });
  if (rentangKustom) {
    slipParams.set("dari", rentangKustom.dari);
    slipParams.set("sampai", rentangKustom.sampai);
  }

  function simpan() {
    const form = new FormData();
    form.set("userId", awal.userId);
    form.set("periode", periode);
    for (const [key] of KOMPONEN) form.set(key, nilai[key]);
    form.set("keteranganPenyesuaian", nilai.keteranganPenyesuaian);

    mulai(async () => onPesan(await simpanPayroll(form)));
  }

  return (
    <tr className="border-b border-line/70 last:border-0">
      <th scope="row" className="p-3 text-left">
        <span className="font-medium">{awal.nama}</span>
        <span className="block text-xs font-normal text-muted">{awal.cabang}</span>
      </th>
      {KOMPONEN.map(([key, label]) => (
        <td key={key} className="p-2 text-right">
          {bolehUbah ? (
            <>
              <Label className="sr-only" htmlFor={`${key}-${awal.userId}`}>
                {label} {awal.nama}
              </Label>
              <Input
                id={`${key}-${awal.userId}`}
                name={key}
                type="number"
                min={key === "penyesuaian" ? undefined : 0}
                step={1}
                inputMode="numeric"
                value={nilai[key]}
                onChange={(e) => setNilai((n) => ({ ...n, [key]: e.target.value }))}
                className={`h-auto px-2.5 py-1.5 text-right tabular-nums ${
                  key === "penyesuaian" ? "w-40" : "w-32"
                }`}
              />
            </>
          ) : (
            <span className="tabular-nums">{formatRupiah(awal[key])}</span>
          )}
          {key === "penyesuaian" ? (
            bolehUbah ? (
              <>
                <div className="mt-1.5 flex gap-1">
                  <Button
                    type="button"
                    variant={tandaNegatif ? "outline" : "default"}
                    size="sm"
                    onClick={() => aturTanda(false)}
                    title="Penyesuaian sebagai tambahan (nominal positif)"
                    className="h-7 flex-1 px-1 text-xs"
                  >
                    + Tambah
                  </Button>
                  <Button
                    type="button"
                    variant={tandaNegatif ? "default" : "outline"}
                    size="sm"
                    onClick={() => aturTanda(true)}
                    title="Penyesuaian sebagai pengurangan (nominal negatif)"
                    className="h-7 flex-1 px-1 text-xs"
                  >
                    − Kurang
                  </Button>
                </div>
                <Label
                  className="sr-only"
                  htmlFor={`keteranganPenyesuaian-${awal.userId}`}
                >
                  Keterangan penyesuaian {awal.nama}
                </Label>
                <Input
                  id={`keteranganPenyesuaian-${awal.userId}`}
                  name="keteranganPenyesuaian"
                  type="text"
                  maxLength={100}
                  placeholder="Keterangan"
                  value={nilai.keteranganPenyesuaian}
                  onChange={(e) =>
                    setNilai((n) => ({
                      ...n,
                      keteranganPenyesuaian: e.target.value,
                    }))
                  }
                  className="mt-1.5 h-auto w-40 px-2.5 py-1.5 text-left"
                />
              </>
            ) : awal.keteranganPenyesuaian ? (
              <span className="block text-xs font-normal text-muted">
                {awal.keteranganPenyesuaian}
              </span>
            ) : null
          ) : null}
          {key === "gajiPokok" ? (
            <>
              {awal.gajiPokokFleksibel > 0 ? (
                <span className="block text-xs font-normal text-muted">
                  + {awal.jamFleksibel} jam fleksibel ×{" "}
                  {formatRupiah(TARIF_PER_JAM)}
                </span>
              ) : null}
              {awal.gajiPokokHarian > 0 ? (
                <span className="block text-xs font-normal text-muted">
                  + {awal.jamShiftBiasa} jam shift biasa ({awal.hariShiftBiasa}{" "}
                  hari) × {formatRupiah(TARIF_PER_JAM)}
                </span>
              ) : null}
            </>
          ) : null}
        </td>
      ))}
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.potonganTelat)}
        <span className="block text-xs font-normal text-muted">
          {awal.menitTelatRekap} menit × {formatRupiah(TARIF_POTONGAN_TELAT_PER_MENIT)}
        </span>
      </td>
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.kasbonSisa)}
        <span className="block text-xs font-normal text-muted">diajukan + disetujui</span>
      </td>
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.insentif)}
        <span className="block text-xs font-normal text-muted">dari sinkron iNOX</span>
      </td>
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.tunjanganMakan)}
        <span className="block text-xs font-normal text-muted">
          {awal.hariHadir} hari × {formatRupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)}
        </span>
      </td>
      <td className="p-3 text-right tabular-nums">
        {formatRupiah(awal.lembur)}
        <span className="block text-xs font-normal text-muted">
          {awal.jamLembur} jam × {formatRupiah(TARIF_LEMBUR_PER_JAM)}
        </span>
      </td>
      <td className="p-3 text-right tabular-nums">
        <span className={peringatan ? "text-status-alpa" : "font-medium"}>
          {formatRupiah(diterima)}
        </span>
        {peringatan ? (
          <span className="block text-xs text-status-alpa">potongan berlebih</span>
        ) : null}
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-2">
          {bolehUbah ? (
            <Button
              type="button"
              size="sm"
              disabled={menunggu}
              onClick={simpan}
              className="px-3 text-sm"
            >
              {menunggu ? "Menyimpan…" : "Simpan"}
            </Button>
          ) : null}
          <a
            href={`/admin/payroll/ekspor?${slipParams.toString()}`}
            className="rounded-lg border border-line px-3 py-1.5 text-center text-xs font-medium"
            title="Unduh slip gaji karyawan ini (PDF)"
          >
            Slip PDF
          </a>
          {bolehUbah ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={menunggu}
              title="Isi kolom kasbon dari sisa kasbon diajukan + disetujui; belum tersimpan sampai Simpan ditekan"
              onClick={() =>
                setNilai((n) => ({ ...n, kasbon: String(awal.kasbonSisa) }))
              }
            >
              Isi kasbon dari pengajuan
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

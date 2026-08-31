"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { kosongkanMinggu, salinMinggu, type Hasil } from "./actions";
import { DaftarShift, type ShiftLengkap } from "./daftar-shift";
import { FormRentang } from "./form-rentang";
import { FilterOverview } from "./filter-overview";
import { SpreadsheetJadwal } from "./spreadsheet";
import { AlatJadwal } from "./alat-jadwal";
import { updateJadwalCell } from "@/lib/spreadsheet";
import {
  MatriksJadwal,
  type BarisJadwal,
  type SeragamOption,
  type Shift,
} from "./matriks-jadwal";

export type CabangOption = { id: string; nama: string };

export function PanelJadwal({
  minggu,
  baris,
  shift,
  shiftLengkap,
  seragam,
  bolehUbahShift,
  bolehPilihCabang,
  cabang,
  cabangTerpilih,
  karyawanRentang,
  rentangAktif,
  navigasi,
}: {
  minggu: string[];
  baris: BarisJadwal[];
  shift: Shift[];
  shiftLengkap: ShiftLengkap[];
  seragam: SeragamOption[];
  bolehUbahShift: boolean;
  bolehPilihCabang: boolean;
  cabang: CabangOption[];
  cabangTerpilih: string;
  karyawanRentang: { id: string; nama: string }[];
  rentangAktif: { dari: string; sampai: string };
  navigasi: {
    labelMinggu: string;
    sebelumnya: string;
    berikutnya: string;
    iniMingguIni: boolean;
    seninSekarang: string;
    seninSebelumnya: string;
    rentangAktif: boolean;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pesan, setPesan] = useState<Hasil | null>(null);
  const [barisLive, setBarisLive] = useState(baris);
  const [formRentang, setFormRentang] = useState(false);
  const [menunggu, mulai] = useTransition();
  const adaJadwal = barisLive.some((b) => b.hari.some(Boolean));

  useEffect(() => setBarisLive(baris), [baris]);

  function ubahCell(userId: string, tanggal: string, shiftId: string, seragamId: string) {
    setBarisLive((lama) =>
      updateJadwalCell(
        lama,
        minggu,
        userId,
        tanggal,
        shiftId,
        seragamId,
        seragam.find((s) => s.id === seragamId)?.nama ?? null,
      ),
    );
  }

  function selesaiAksi(hasil: Hasil) {
    setPesan(hasil);
    if (hasil.ok) router.refresh();
  }

  function urlMinggu(tanggal?: string): Route {
    const q = new URLSearchParams();
    if (tanggal) q.set("minggu", tanggal);
    if (cabangTerpilih) q.set("cabang", cabangTerpilih);
    return `/admin/jadwal${q.size ? `?${q}` : ""}` as Route;
  }

  function pilihCabang(id: string) {
    const q = new URLSearchParams(params);
    if (id) q.set("cabang", id);
    else q.delete("cabang");
    router.push(`/admin/jadwal?${q}`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-3">
        {bolehPilihCabang ? (
          <select
            aria-label="Pilih cabang jadwal"
            value={cabangTerpilih}
            onChange={(e) => pilihCabang(e.target.value)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
          >
            <option value="">Semua cabang</option>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        ) : null}

        {!navigasi.rentangAktif ? (
          <>
            <Link href={urlMinggu(navigasi.sebelumnya)} className="rounded-lg border border-line px-3 py-1.5 text-sm">
              ‹ Minggu lalu
            </Link>
            <span className="px-1 text-sm font-medium tabular-nums">
              {navigasi.labelMinggu}
            </span>
            <Link href={urlMinggu(navigasi.berikutnya)} className="rounded-lg border border-line px-3 py-1.5 text-sm">
              Minggu depan ›
            </Link>
          </>
        ) : (
          <span className="px-1 text-sm font-medium tabular-nums">
            {navigasi.labelMinggu}
          </span>
        )}

        {navigasi.rentangAktif || !navigasi.iniMingguIni ? (
          <Link href={urlMinggu()} className="rounded-lg px-3 py-1.5 text-sm text-muted underline">
            Ke minggu ini
          </Link>
        ) : null}

        <span className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFormRentang((v) => !v)}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
          >
            Terapkan shift massal
          </button>
          {!navigasi.rentangAktif ? (
            <>
              <button
                type="button"
                disabled={menunggu}
                onClick={() =>
                  mulai(async () =>
                    selesaiAksi(
                      await salinMinggu(
                        navigasi.seninSebelumnya,
                        navigasi.seninSekarang,
                      ),
                    ),
                  )
                }
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              >
                Salin dari minggu lalu
              </button>
              <button
                type="button"
                disabled={menunggu || !adaJadwal}
                onClick={() =>
                  mulai(async () =>
                    selesaiAksi(await kosongkanMinggu(navigasi.seninSekarang)),
                  )
                }
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted disabled:opacity-40"
              >
                Kosongkan
              </button>
            </>
          ) : null}
        </span>
      </div>

      {formRentang ? (
        <FormRentang
          karyawan={karyawanRentang}
          shift={shift}
          seragam={seragam}
          cabangId={cabangTerpilih}
          awal={rentangAktif.dari}
          akhir={rentangAktif.sampai}
          onSelesai={(h) => {
            setPesan(h);
            setFormRentang(false);
          }}
          onBatal={() => setFormRentang(false)}
        />
      ) : null}

      <FilterOverview
        key={`${rentangAktif.dari}:${rentangAktif.sampai}:${cabangTerpilih}`}
        awal={rentangAktif.dari}
        akhir={rentangAktif.sampai}
        cabangId={cabangTerpilih}
      />

      {pesan ? (
        <p role="status" aria-live="polite" className={`mb-4 rounded-xl px-3.5 py-2.5 text-sm ${pesan.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {pesan.pesan}
        </p>
      ) : null}

      <MatriksJadwal minggu={minggu} baris={barisLive} shift={shift} seragam={seragam} onPesan={setPesan} onCellChange={ubahCell} />
      <SpreadsheetJadwal tanggal={minggu} baris={barisLive} shift={shift} />
      <AlatJadwal
        awal={rentangAktif.dari}
        akhir={rentangAktif.sampai}
        polaMulai={navigasi.seninSekarang}
        cabangId={cabangTerpilih}
        onPesan={selesaiAksi}
      />

      <div className="mt-6">
        <Card
          title="Definisi shift"
          footer={
            bolehUbahShift
              ? "Perubahan jam shift berlaku untuk semua cabang dan langsung memengaruhi perhitungan telat."
              : "Hanya super admin yang dapat mengubah definisi shift."
          }
        >
          {bolehUbahShift ? (
            <DaftarShift shift={shiftLengkap} onPesan={setPesan} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {shiftLengkap.map((s) => (
                <li key={s.id} className="rounded-xl border border-line bg-surface/60 p-3">
                  <p className="text-sm font-medium">{s.nama}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-muted">{s.mulai}–{s.selesai}</p>
                  <p className="mt-1 text-xs text-muted">Toleransi {s.toleransiMenit} menit</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

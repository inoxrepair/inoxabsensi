"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { RADIUS_MAKS, RADIUS_MIN } from "@/lib/cabang";
import { simpanCabang, ubahStatusCabang, type HasilSimpan } from "./actions";

export type Cabang = {
  id: string;
  nama: string;
  kota: string;
  lat: number;
  lng: number;
  radiusMeter: number;
  aktif: boolean;
  jumlahKaryawan: number;
};

const KELAS_INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";

/** Daftar cabang dengan panel edit inline per baris. */
export function DaftarCabang({ cabang }: { cabang: Cabang[] }) {
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [pesan, setPesan] = useState<HasilSimpan | null>(null);

  function tutup(hasil?: HasilSimpan) {
    setDibuka(null);
    if (hasil) setPesan(hasil);
  }

  return (
    <div className="space-y-3">
      {pesan ? <Notifikasi hasil={pesan} /> : null}

      {dibuka === "baru" ? (
        <FormCabang
          judul="Cabang baru"
          onSelesai={tutup}
          onBatal={() => setDibuka(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setPesan(null);
            setDibuka("baru");
          }}
          className="w-full rounded-xl border border-dashed border-line bg-paper px-4 py-3 text-sm font-medium"
        >
          + Tambah cabang
        </button>
      )}

      <ul className="space-y-3">
        {cabang.map((c) =>
          dibuka === c.id ? (
            <li key={c.id}>
              <FormCabang
                judul={`Ubah ${c.nama}`}
                cabang={c}
                onSelesai={tutup}
                onBatal={() => setDibuka(null)}
              />
            </li>
          ) : (
            <li key={c.id}>
              <BarisCabang
                cabang={c}
                onUbah={() => {
                  setPesan(null);
                  setDibuka(c.id);
                }}
                onStatus={setPesan}
              />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function BarisCabang({
  cabang: c,
  onUbah,
  onStatus,
}: {
  cabang: Cabang;
  onUbah: () => void;
  onStatus: (h: HasilSimpan) => void;
}) {
  const [menunggu, mulai] = useTransition();

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {c.nama}
            {!c.aktif ? (
              <span className="ml-2 text-xs font-normal text-muted">
                nonaktif
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {c.kota} · {c.jumlahKaryawan} karyawan aktif
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUbah}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
          >
            Ubah
          </button>
          <button
            type="button"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => onStatus(await ubahStatusCabang(c.id, !c.aktif)))
            }
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted disabled:opacity-40"
          >
            {menunggu ? "…" : c.aktif ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Latitude</dt>
          <dd className="tabular-nums">{c.lat.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Longitude</dt>
          <dd className="tabular-nums">{c.lng.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Radius absensi</dt>
          <dd className="tabular-nums">{c.radiusMeter} m</dd>
        </div>
      </dl>
    </div>
  );
}

function FormCabang({
  judul,
  cabang: c,
  onSelesai,
  onBatal,
}: {
  judul: string;
  cabang?: Cabang;
  onSelesai: (hasil: HasilSimpan) => void;
  onBatal: () => void;
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, mulai] = useTransition();
  const [lokasiSibuk, setLokasiSibuk] = useState(false);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const namaRef = useRef<HTMLInputElement>(null);

  useEffect(() => namaRef.current?.focus(), []);

  function kirim(formData: FormData) {
    setGalat(null);
    mulai(async () => {
      const hasil = await simpanCabang(c?.id ?? null, formData);
      if (hasil.ok) onSelesai(hasil);
      else setGalat(hasil.pesan);
    });
  }

  /** Isi koordinat dari GPS perangkat admin, mempercepat pendataan di lokasi. */
  function ambilLokasi() {
    if (!navigator.geolocation) {
      setGalat("Perangkat ini tidak mendukung deteksi lokasi.");
      return;
    }
    setLokasiSibuk(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLokasiSibuk(false);
        if (latRef.current) latRef.current.value = coords.latitude.toFixed(6);
        if (lngRef.current) lngRef.current.value = coords.longitude.toFixed(6);
      },
      () => {
        setLokasiSibuk(false);
        setGalat("Lokasi tidak terdeteksi. Isi koordinat manual.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <form
      action={kirim}
      className="rounded-xl border border-ink bg-paper p-4"
      aria-label={judul}
    >
      <p className="text-sm font-semibold">{judul}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nama" className="text-xs text-muted">
            Nama cabang
          </label>
          <input
            ref={namaRef}
            id="nama"
            name="nama"
            defaultValue={c?.nama}
            required
            maxLength={60}
            className={KELAS_INPUT}
          />
        </div>
        <div>
          <label htmlFor="kota" className="text-xs text-muted">
            Kota
          </label>
          <input
            id="kota"
            name="kota"
            defaultValue={c?.kota}
            required
            maxLength={40}
            className={KELAS_INPUT}
          />
        </div>
        <div>
          <label htmlFor="lat" className="text-xs text-muted">
            Latitude
          </label>
          <input
            ref={latRef}
            id="lat"
            name="lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            defaultValue={c?.lat}
            required
            inputMode="decimal"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="lng" className="text-xs text-muted">
            Longitude
          </label>
          <input
            ref={lngRef}
            id="lng"
            name="lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            defaultValue={c?.lng}
            required
            inputMode="decimal"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="radiusMeter" className="text-xs text-muted">
            Radius absensi (meter)
          </label>
          <input
            id="radiusMeter"
            name="radiusMeter"
            type="number"
            step={1}
            min={RADIUS_MIN}
            max={RADIUS_MAKS}
            defaultValue={c?.radiusMeter ?? 100}
            required
            inputMode="numeric"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="aktif"
              defaultChecked={c?.aktif ?? true}
              className="size-4 accent-ink"
            />
            Cabang aktif
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={ambilLokasi}
        disabled={lokasiSibuk}
        className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-40"
      >
        {lokasiSibuk ? "Mendeteksi…" : "Pakai lokasi saya sekarang"}
      </button>

      {galat ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa"
        >
          {galat}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={mengirim}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
        >
          {mengirim ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onBatal}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function Notifikasi({ hasil }: { hasil: HasilSimpan }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        hasil.ok
          ? "bg-status-hadir/10 text-status-hadir"
          : "bg-status-alpa/10 text-status-alpa"
      }`}
    >
      {hasil.pesan}
    </p>
  );
}

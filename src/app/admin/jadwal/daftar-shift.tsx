"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { TOLERANSI_MAKS } from "@/lib/jadwal";
import { hapusShift, simpanShift, type Hasil } from "./actions";

export type ShiftLengkap = {
  id: string;
  nama: string;
  mulai: string;
  selesai: string;
  toleransiMenit: number;
  dipakai: number;
  lintasTengahMalam: boolean;
  mode: "terjadwal" | "fleksibel";
  minimumKerjaMenit: number | null;
};

const KELAS_INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";

/** Pengelolaan definisi shift; hanya dirender untuk super admin. */
export function DaftarShift({
  shift,
  onPesan,
}: {
  shift: ShiftLengkap[];
  onPesan: (h: Hasil) => void;
}) {
  const [dibuka, setDibuka] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shift.map((s) =>
          dibuka === s.id ? (
            <li key={s.id} className="sm:col-span-2 lg:col-span-3">
              <FormShift
                judul={`Ubah shift ${s.nama}`}
                shift={s}
                onSelesai={(h) => {
                  setDibuka(null);
                  onPesan(h);
                }}
                onBatal={() => setDibuka(null)}
              />
            </li>
          ) : (
            <li
              key={s.id}
              className="rounded-xl border border-line bg-paper p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.nama}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-muted">
                    {s.mode === "fleksibel" ? "Jam aktual masuk–keluar" : `${s.mulai}–${s.selesai}`}
                    {s.mode !== "fleksibel" && s.lintasTengahMalam ? (
                      <span className="ml-1 text-xs">(+1 hari)</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {s.mode === "fleksibel"
                      ? `Fleksibel${s.minimumKerjaMenit != null ? ` · target ${s.minimumKerjaMenit / 60} jam` : " · tanpa minimum"}`
                      : `Toleransi ${s.toleransiMenit} menit`} · dipakai {s.dipakai} hari
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setDibuka(s.id)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium"
                  >
                    Ubah
                  </button>
                  <TombolHapus id={s.id} onPesan={onPesan} />
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {dibuka === "baru" ? (
        <FormShift
          judul="Shift baru"
          onSelesai={(h) => {
            setDibuka(null);
            onPesan(h);
          }}
          onBatal={() => setDibuka(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setDibuka("baru")}
          className="w-full rounded-xl border border-dashed border-line bg-paper px-4 py-2.5 text-sm font-medium"
        >
          + Tambah shift
        </button>
      )}
    </div>
  );
}

function TombolHapus({
  id,
  onPesan,
}: {
  id: string;
  onPesan: (h: Hasil) => void;
}) {
  const [menunggu, mulai] = useTransition();

  return (
    <button
      type="button"
      disabled={menunggu}
      onClick={() => mulai(async () => onPesan(await hapusShift(id)))}
      className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted disabled:opacity-40"
    >
      {menunggu ? "…" : "Hapus"}
    </button>
  );
}

function FormShift({
  judul,
  shift: s,
  onSelesai,
  onBatal,
}: {
  judul: string;
  shift?: ShiftLengkap;
  onSelesai: (h: Hasil) => void;
  onBatal: () => void;
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, mulai] = useTransition();
  const namaRef = useRef<HTMLInputElement>(null);

  useEffect(() => namaRef.current?.focus(), []);

  function kirim(formData: FormData) {
    setGalat(null);
    mulai(async () => {
      const hasil = await simpanShift(s?.id ?? null, formData);
      if (hasil.ok) onSelesai(hasil);
      else setGalat(hasil.pesan);
    });
  }

  return (
    <form
      action={kirim}
      aria-label={judul}
      className="rounded-xl border border-ink bg-paper p-4"
    >
      <p className="text-sm font-semibold">{judul}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
          <label htmlFor="nama" className="text-xs text-muted">
            Nama shift
          </label>
          <input
            ref={namaRef}
            id="nama"
            name="nama"
            defaultValue={s?.nama}
            required
            maxLength={30}
            className={KELAS_INPUT}
          />
        </div>
        <div>
          <label htmlFor="mode" className="text-xs text-muted">
            Mode shift
          </label>
          <select id="mode" name="mode" defaultValue={s?.mode ?? "terjadwal"} className={KELAS_INPUT}>
            <option value="terjadwal">Terjadwal (hitung telat)</option>
            <option value="fleksibel">Fleksibel (tanpa telat)</option>
          </select>
        </div>
        <div>
          <label htmlFor="minimumKerjaJam" className="text-xs text-muted">
            Minimum kerja (jam, opsional)
          </label>
          <input id="minimumKerjaJam" name="minimumKerjaJam" type="number" min={0} max={24} step="0.5" defaultValue={s?.minimumKerjaMenit != null ? s.minimumKerjaMenit / 60 : ""} placeholder="Kosong = tanpa minimum" className={`${KELAS_INPUT} tabular-nums`} />
        </div>
        <div>
          <label htmlFor="jamMulai" className="text-xs text-muted">
            Jam mulai
          </label>
          <input
            id="jamMulai"
            name="jamMulai"
            defaultValue={s?.mulai ?? "09.00"}
            required
            placeholder="09.00"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="jamSelesai" className="text-xs text-muted">
            Jam selesai
          </label>
          <input
            id="jamSelesai"
            name="jamSelesai"
            defaultValue={s?.selesai ?? "17.00"}
            required
            placeholder="17.00"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="toleransiMenit" className="text-xs text-muted">
            Toleransi (menit)
          </label>
          <input
            id="toleransiMenit"
            name="toleransiMenit"
            type="number"
            min={0}
            max={TOLERANSI_MAKS}
            step={1}
            defaultValue={s?.toleransiMenit ?? 10}
            required
            inputMode="numeric"
            className={`${KELAS_INPUT} tabular-nums`}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        Jam selesai lebih kecil dari jam mulai berarti shift berakhir hari
        berikutnya, misalnya 22.00–06.00.
      </p>

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

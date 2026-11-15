"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYCLE_MAKS, TOLERANSI_MAKS } from "@/lib/jadwal";
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
  maksimalCycle: number;
};

const KELAS_INPUT =
  "mt-1.5 w-full rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-3 py-2 text-sm";

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
              className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3"
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
                       ? `Fleksibel · maksimal ${s.maksimalCycle} cycle${s.minimumKerjaMenit != null ? ` · target ${s.minimumKerjaMenit / 60} jam` : " · tanpa minimum"}`
                      : `Toleransi ${s.toleransiMenit} menit`} · dipakai {s.dipakai} hari
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDibuka(s.id)}
                  >
                    Ubah
                  </Button>
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
        <Button
          type="button"
          variant="glass"
          onClick={() => setDibuka("baru")}
          className="h-auto w-full rounded-xl border-dashed px-4 py-2.5"
        >
          + Tambah shift
        </Button>
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={menunggu}
      onClick={() => mulai(async () => onPesan(await hapusShift(id)))}
      className="text-muted"
    >
      {menunggu ? "…" : "Hapus"}
    </Button>
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
      className="rounded-2xl border border-ink bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4"
    >
      <p className="text-sm font-semibold">{judul}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
          <Label htmlFor="nama" className="text-xs font-normal text-muted">
            Nama shift
          </Label>
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
          <Label htmlFor="maksimalCycle" className="text-xs font-normal text-muted">
            Maksimal cycle absensi
          </Label>
          <Select name="maksimalCycle" defaultValue={String(s?.maksimalCycle ?? (s?.mode === "fleksibel" ? 3 : 1))}>
            <SelectTrigger id="maksimalCycle" className="mt-1.5 tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: CYCLE_MAKS }, (_, i) => i + 1).map((jumlah) => (
                <SelectItem key={jumlah} value={String(jumlah)}>{jumlah} cycle</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="mode" className="text-xs font-normal text-muted">
            Mode shift
          </Label>
          <Select name="mode" defaultValue={s?.mode ?? "terjadwal"}>
            <SelectTrigger id="mode" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terjadwal">Terjadwal (hitung telat)</SelectItem>
              <SelectItem value="fleksibel">Fleksibel (tanpa telat)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="minimumKerjaJam" className="text-xs font-normal text-muted">
            Minimum kerja (jam, opsional)
          </Label>
          <Input id="minimumKerjaJam" name="minimumKerjaJam" type="number" min={0} max={24} step="0.5" defaultValue={s?.minimumKerjaMenit != null ? s.minimumKerjaMenit / 60 : ""} placeholder="Kosong = tanpa minimum" className="mt-1.5 tabular-nums" />
        </div>
        <div>
          <Label htmlFor="jamMulai" className="text-xs font-normal text-muted">
            Jam mulai
          </Label>
          <Input
            id="jamMulai"
            name="jamMulai"
            defaultValue={s?.mulai ?? "09.00"}
            required
            placeholder="09.00"
            className="mt-1.5 tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="jamSelesai" className="text-xs font-normal text-muted">
            Jam selesai
          </Label>
          <Input
            id="jamSelesai"
            name="jamSelesai"
            defaultValue={s?.selesai ?? "17.00"}
            required
            placeholder="17.00"
            className="mt-1.5 tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="toleransiMenit" className="text-xs font-normal text-muted">
            Toleransi (menit)
          </Label>
          <Input
            id="toleransiMenit"
            name="toleransiMenit"
            type="number"
            min={0}
            max={TOLERANSI_MAKS}
            step={1}
            defaultValue={s?.toleransiMenit ?? 10}
            required
            inputMode="numeric"
            className="mt-1.5 tabular-nums"
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
        <Button
          type="submit"
          disabled={mengirim}
        >
          {mengirim ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onBatal}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

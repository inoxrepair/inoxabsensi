"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aturRentang, previewRentang, type Hasil } from "./actions";
import {
  DialogKonfirmasiMassal,
  type RingkasanMassal,
} from "./konfirmasi-massal";
import type { SeragamOption, Shift } from "./matriks-jadwal";
import { InputTanggal } from "@/components/ui/input-tanggal";

export function FormRentang({
  karyawan,
  shift,
  seragam,
  cabangId,
  awal,
  akhir,
  onSelesai,
  onBatal,
}: {
  karyawan: { id: string; nama: string }[];
  shift: Shift[];
  seragam: SeragamOption[];
  cabangId: string;
  awal: string;
  akhir: string;
  onSelesai: (h: Hasil) => void;
  onBatal: () => void;
}) {
  const [dipilih, setDipilih] = useState(() => new Set(karyawan.map((k) => k.id)));
  const [galat, setGalat] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState<{
    ringkasan: RingkasanMassal;
    form: FormData;
  } | null>(null);
  const router = useRouter();

  // State lokal untuk date input agar kompatibel dengan iOS Safari
  // yang kadang tidak memicu onChange pada type="date" dalam form.
  const [dari, setDari] = useState(awal);
  const [sampai, setSampai] = useState(akhir);

  function toggle(id: string) {
    setDipilih((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat(null);

    if (!dari || !sampai) {
      setGalat("Tanggal dari dan sampai wajib diisi.");
      return;
    }

    const form = new FormData();
    form.set("dari", dari);
    form.set("sampai", sampai);
    form.set("cabangId", cabangId);
    for (const id of dipilih) form.append("userId", id);

    // Ambil nilai shift dari select langsung karena tidak ada state terpisah.
    // Nilai sentinel "off"/"tanpa" dipetakan kembali ke "" (Radix Select
    // tidak mengizinkan SelectItem dengan value "").
    const selectEl = e.currentTarget.elements.namedItem("shiftId") as HTMLSelectElement | null;
    if (selectEl) form.set("shiftId", selectEl.value === "off" ? "" : selectEl.value);
    const seragamEl = e.currentTarget.elements.namedItem("seragamId") as HTMLSelectElement | null;
    if (seragamEl) form.set("seragamId", seragamEl.value === "tanpa" ? "" : seragamEl.value);

    // Langkah 1: preview tanpa menulis. Langkah 2: dialog konfirmasi.
    mulai(async () => {
      const preview = await previewRentang(form);
      if (!preview.ok) {
        setGalat(preview.pesan);
        return;
      }
      setKonfirmasi({
        ringkasan: {
          judul: "Terapkan shift massal?",
          karyawan: preview.karyawan,
          dari: preview.dari,
          sampai: preview.sampai,
          jumlahHari: preview.jumlahHari,
          barisDihapus: preview.barisDihapus,
          barisDibuat: preview.barisDibuat,
        },
        form,
      });
    });
  }

  function jalankanKonfirmasi() {
    if (!konfirmasi) return;
    const form = konfirmasi.form;
    setKonfirmasi(null);
    mulai(async () => {
      const hasil = await aturRentang(form);
      if (hasil.ok) {
        const q = new URLSearchParams({ dari, sampai });
        if (cabangId) q.set("cabang", cabangId);
        onSelesai(hasil);
        router.push(`/admin/jadwal?${q}` as Route);
      } else {
        setGalat(hasil.pesan);
      }
    });
  }

  return (
    <>
    <form onSubmit={kirim} className="mb-4 rounded-2xl border border-ink bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <p className="text-sm font-semibold">Terapkan shift massal</p>
      <p className="mt-1 text-xs text-muted">
        Aksi ini mengubah jadwal karyawan terpilih pada seluruh tanggal.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Label className="text-xs font-normal text-muted">
          Dari
          <InputTanggal name="dari" value={dari} onChange={setDari} required className="mt-1.5 w-full" />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Seragam
          <Select name="seragamId" defaultValue="tanpa">
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tanpa">Tanpa seragam</SelectItem>
              {seragam.filter((s) => s.aktif).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <Label className="text-xs font-normal text-muted">
          Sampai
          <InputTanggal name="sampai" value={sampai} onChange={setSampai} required className="mt-1.5 w-full" />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Shift
          <Select name="shiftId" defaultValue="off">
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off (hapus jadwal)</SelectItem>
              {shift.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nama} ({s.mulai}–{s.selesai})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
      </div>
      <input type="hidden" name="cabangId" value={cabangId} />

      <fieldset className="mt-4">
        <legend className="text-xs text-muted">Karyawan yang diterapkan</legend>
        <div className="mt-2 max-h-60 overflow-y-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {karyawan.map((k) => (
            <Label key={k.id} htmlFor={`rentang-${k.id}`} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-normal">
              <Checkbox
                id={`rentang-${k.id}`}
                checked={dipilih.has(k.id)}
                onCheckedChange={() => toggle(k.id)}
              />
              <span className="truncate">{k.nama}</span>
            </Label>
          ))}
        </div>
      </fieldset>

      {galat ? (
        <p role="alert" className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={menunggu || dipilih.size === 0}>
          {menunggu ? "Menerapkan…" : "Lihat dampak & terapkan"}
        </Button>
        <Button type="button" variant="outline" onClick={onBatal}>
          Batal
        </Button>
      </div>
    </form>
    {konfirmasi ? (
      <DialogKonfirmasiMassal
        ringkasan={konfirmasi.ringkasan}
        sedang={menunggu}
        onBatal={() => setKonfirmasi(null)}
        onKonfirmasi={jalankanKonfirmasi}
      />
    ) : null}
    </>
  );
}

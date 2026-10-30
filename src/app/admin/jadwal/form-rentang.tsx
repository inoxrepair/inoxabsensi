"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { aturRentang, previewRentang, type Hasil } from "./actions";
import {
  DialogKonfirmasiMassal,
  type RingkasanMassal,
} from "./konfirmasi-massal";
import type { SeragamOption, Shift } from "./matriks-jadwal";

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
    const selectEl = e.currentTarget.elements.namedItem("shiftId") as HTMLSelectElement | null;
    if (selectEl) form.set("shiftId", selectEl.value);
    const seragamEl = e.currentTarget.elements.namedItem("seragamId") as HTMLSelectElement | null;
    if (seragamEl) form.set("seragamId", seragamEl.value);

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
    <form onSubmit={kirim} className="mb-4 rounded-xl border border-ink bg-paper p-4">
      <p className="text-sm font-semibold">Terapkan shift massal</p>
      <p className="mt-1 text-xs text-muted">
        Aksi ini mengubah jadwal karyawan terpilih pada seluruh tanggal.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Dari
          <input
            name="dari"
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Seragam
          <select name="seragamId" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Tanpa seragam</option>
            {seragam.filter((s) => s.aktif).map((s) => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Sampai
          <input
            name="sampai"
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Shift
          <select name="shiftId" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Off (hapus jadwal)</option>
            {shift.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.mulai}–{s.selesai})
              </option>
            ))}
          </select>
        </label>
      </div>
      <input type="hidden" name="cabangId" value={cabangId} />

      <fieldset className="mt-4">
        <legend className="text-xs text-muted">Karyawan yang diterapkan</legend>
        <div className="mt-2 max-h-60 overflow-y-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {karyawan.map((k) => (
            <label key={k.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={dipilih.has(k.id)}
                onChange={() => toggle(k.id)}
                className="size-4 accent-ink"
              />
              <span className="truncate">{k.nama}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {galat ? (
        <p role="alert" className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={menunggu || dipilih.size === 0} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
          {menunggu ? "Menerapkan…" : "Lihat dampak & terapkan"}
        </button>
        <button type="button" onClick={onBatal} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
          Batal
        </button>
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateJadwalBulanan,
  importJadwalCsv,
  previewGenerateBulanan,
  previewImportCsv,
  type Hasil,
} from "./actions";
import {
  DialogKonfirmasiMassal,
  type RingkasanMassal,
} from "./konfirmasi-massal";

export function AlatJadwal({
  awal,
  akhir,
  polaMulai,
  cabangId,
  onPesan,
}: {
  awal: string;
  akhir: string;
  polaMulai: string;
  cabangId: string;
  onPesan: (h: Hasil) => void;
}) {
  const [bulan, setBulan] = useState(awal.slice(0, 7));
  const [pending, mulai] = useTransition();
  const [konfirmasi, setKonfirmasi] = useState<{
    ringkasan: RingkasanMassal;
    aksi: "import" | "generate";
    file?: File;
  } | null>(null);
  const router = useRouter();
  const exportUrl = `/admin/jadwal/export?dari=${awal}&sampai=${akhir}${cabangId ? `&cabang=${cabangId}` : ""}`;

  function importCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("cabangId", cabangId);
    const file = fd.get("file");
    mulai(async () => {
      const preview = await previewImportCsv(fd);
      if (!preview.ok) {
        onPesan({ ok: false, pesan: preview.pesan });
        return;
      }
      setKonfirmasi({
        ringkasan: {
          judul: "Import CSV jadwal?",
          karyawan: preview.karyawan,
          dari: preview.dari,
          sampai: preview.sampai,
          jumlahHari: preview.jumlahHari,
          barisDihapus: preview.barisDihapus,
          barisDibuat: preview.barisDibuat,
          catatan:
            "Seragam tidak ikut dalam import CSV (baris hasil import tanpa seragam). Satu baris salah membuat seluruh import gagal, seperti sebelumnya.",
        },
        aksi: "import",
        file: file instanceof File ? file : undefined,
      });
    });
  }

  function generate() {
    const fd = new FormData();
    fd.set("bulan", bulan);
    fd.set("polaMulai", polaMulai);
    fd.set("cabangId", cabangId);
    mulai(async () => {
      const preview = await previewGenerateBulanan(fd);
      if (!preview.ok) {
        onPesan({ ok: false, pesan: preview.pesan });
        return;
      }
      setKonfirmasi({
        ringkasan: {
          judul: "Generate jadwal bulanan?",
          karyawan: preview.karyawan,
          dari: preview.dari,
          sampai: preview.sampai,
          jumlahHari: preview.jumlahHari,
          barisDihapus: preview.barisDihapus,
          barisDibuat: preview.barisDibuat,
        },
        aksi: "generate",
      });
    });
  }

  function jalankanKonfirmasi() {
    if (!konfirmasi) return;
    const aksi = konfirmasi.aksi;
    const file = konfirmasi.file;
    setKonfirmasi(null);
    mulai(async () => {
      if (aksi === "import") {
        const fd = new FormData();
        if (file) fd.set("file", file);
        fd.set("cabangId", cabangId);
        const hasil = await importJadwalCsv(fd);
        onPesan(hasil);
        if (hasil.ok) router.refresh();
        return;
      }
      const fd = new FormData();
      fd.set("bulan", bulan);
      fd.set("polaMulai", polaMulai);
      fd.set("cabangId", cabangId);
      const hasil = await generateJadwalBulanan(fd);
      onPesan(hasil);
      if (hasil.ok) router.refresh();
    });
  }

  return (
    <>
    <section className="mt-6 grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Export Excel/CSV</p>
        <p className="mt-1 text-xs text-muted">Unduh overview yang sedang tampil. File dapat dibuka di Excel.</p>
        <a href={exportUrl} className="mt-3 block rounded-lg border border-line px-3 py-2 text-center text-sm font-medium">Unduh CSV</a>
      </div>

      <form onSubmit={importCsv} className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Import dari Excel/CSV</p>
        <p className="mt-1 text-xs text-muted">Gunakan file hasil export, lalu ubah kode P/S/F/O di Excel.</p>
        <input name="file" type="file" accept=".csv,text/csv" required className="mt-3 block w-full text-sm" />
        <button type="submit" disabled={pending} className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm font-medium disabled:opacity-40">Lihat dampak &amp; import CSV</button>
      </form>

      <div className="rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Buat jadwal otomatis bulanan</p>
        <p className="mt-1 text-xs text-muted">Mengulang pola 7 hari mulai {polaMulai} ke seluruh bulan. Hasil tetap bisa diedit.</p>
        <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <button type="button" onClick={generate} disabled={pending} className="mt-3 w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-40">Lihat dampak &amp; generate</button>
      </div>
    </section>
    {konfirmasi ? (
      <DialogKonfirmasiMassal
        ringkasan={konfirmasi.ringkasan}
        sedang={pending}
        onBatal={() => setKonfirmasi(null)}
        onKonfirmasi={jalankanKonfirmasi}
      />
    ) : null}
    </>
  );
}

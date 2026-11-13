"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InputTanggal } from "@/components/ui/input-tanggal";
import { formatTanggal } from "@/lib/format";
import {
  akhirInformasi,
  HALAMAN_KARYAWAN,
  LABEL_AKSI_CTA,
  type AksiCta,
  type InformasiItem,
} from "@/lib/informasi";
import { simpanInformasi, type HasilInformasi } from "./actions";

const KELAS_INPUT =
  "w-full rounded-lg border border-line bg-white/60 px-3 py-2.5 text-sm dark:bg-zinc-900/60";
const KELAS_LABEL = "mb-1.5 block text-sm font-medium";

/**
 * Form buat/ubah pesan informasi. Judul, isi, dan tombol CTA bisa diedit;
 * masa tampil diatur lewat tanggal mulai + durasi (hari); toggle aktif
 * menentukan pesan boleh tampil atau tidak.
 */
export function FormInformasi({
  awal,
  hariIni,
}: {
  awal: InformasiItem | null;
  hariIni: string;
}) {
  const router = useRouter();
  const [judul, setJudul] = useState(awal?.judul ?? "");
  const [isi, setIsi] = useState(awal?.isi ?? "");
  const [ctaLabel, setCtaLabel] = useState(awal?.ctaLabel ?? "Mengerti");
  const [ctaAksi, setCtaAksi] = useState<AksiCta>(awal?.ctaAksi ?? "tutup");
  const [ctaTautan, setCtaTautan] = useState(awal?.ctaTautan ?? "");
  const [ctaHalaman, setCtaHalaman] = useState<string>(
    awal?.ctaHalaman ?? HALAMAN_KARYAWAN[0].nilai,
  );
  const [mulai, setMulai] = useState(awal?.mulaiTanggal ?? hariIni);
  const [durasi, setDurasi] = useState(awal?.durasiHari ?? 3);
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [hasil, setHasil] = useState<HasilInformasi>(undefined);
  const [pending, setPending] = useState(false);

  const sampai = mulai ? akhirInformasi(mulai, Math.max(1, durasi || 1)) : "";

  async function simpan() {
    setPending(true);
    const data = new FormData();
    if (awal) data.append("id", awal.id);
    data.append("judul", judul);
    data.append("isi", isi);
    data.append("ctaLabel", ctaLabel);
    data.append("ctaAksi", ctaAksi);
    data.append("ctaTautan", ctaTautan);
    data.append("ctaHalaman", ctaHalaman);
    data.append("mulaiTanggal", mulai);
    data.append("durasiHari", String(durasi));
    if (aktif) data.append("aktif", "on");
    const res = await simpanInformasi(data);
    setHasil(res);
    setPending(false);
    if (res?.ok) {
      router.refresh();
      if (!awal) {
        setJudul("");
        setIsi("");
        setCtaLabel("Mengerti");
        setCtaAksi("tutup");
        setCtaTautan("");
        setCtaHalaman(HALAMAN_KARYAWAN[0].nilai);
        setMulai(hariIni);
        setDurasi(3);
        setAktif(true);
      }
    }
  }

  return (
    <div>
      <div className="space-y-4">
        <div>
          <label htmlFor="info-judul" className={KELAS_LABEL}>
            Judul
          </label>
          <input
            id="info-judul"
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={100}
            placeholder="Contoh: Libur Hari Raya"
            className={KELAS_INPUT}
          />
        </div>

        <div>
          <label htmlFor="info-isi" className={KELAS_LABEL}>
            Isi informasi
          </label>
          <textarea
            id="info-isi"
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Tulis pesan yang tampil di popup karyawan…"
            className={KELAS_INPUT}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="info-cta-label" className={KELAS_LABEL}>
              Label tombol CTA
            </label>
            <input
              id="info-cta-label"
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              maxLength={30}
              placeholder="Mengerti"
              className={KELAS_INPUT}
            />
          </div>
          <div>
            <label htmlFor="info-cta-aksi" className={KELAS_LABEL}>
              Aksi tombol CTA
            </label>
            <select
              id="info-cta-aksi"
              value={ctaAksi}
              onChange={(e) => setCtaAksi(e.target.value as AksiCta)}
              className={KELAS_INPUT}
            >
              {(Object.keys(LABEL_AKSI_CTA) as AksiCta[]).map((a) => (
                <option key={a} value={a}>
                  {LABEL_AKSI_CTA[a]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {ctaAksi === "tautan" ? (
          <div>
            <label htmlFor="info-cta-tautan" className={KELAS_LABEL}>
              Tautan tujuan
            </label>
            <input
              id="info-cta-tautan"
              type="url"
              value={ctaTautan}
              onChange={(e) => setCtaTautan(e.target.value)}
              maxLength={500}
              placeholder="https://…"
              className={KELAS_INPUT}
            />
          </div>
        ) : null}

        {ctaAksi === "halaman" ? (
          <div>
            <label htmlFor="info-cta-halaman" className={KELAS_LABEL}>
              Halaman tujuan
            </label>
            <select
              id="info-cta-halaman"
              value={ctaHalaman}
              onChange={(e) => setCtaHalaman(e.target.value)}
              className={KELAS_INPUT}
            >
              {HALAMAN_KARYAWAN.map((h) => (
                <option key={h.nilai} value={h.nilai}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="info-mulai" className={KELAS_LABEL}>
              Mulai tampil
            </label>
            <InputTanggal
              id="info-mulai"
              value={mulai}
              onChange={setMulai}
              varian="kaca"
            />
          </div>
          <div>
            <label htmlFor="info-durasi" className={KELAS_LABEL}>
              Durasi (hari)
            </label>
            <input
              id="info-durasi"
              type="number"
              value={durasi}
              onChange={(e) => setDurasi(Number(e.target.value))}
              min={1}
              max={365}
              inputMode="numeric"
              className={KELAS_INPUT}
            />
            {sampai ? (
              <p className="mt-1.5 text-xs text-muted">
                Tampil {formatTanggal(mulai)}–{formatTanggal(sampai)}.
              </p>
            ) : null}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
            className="size-4 accent-ink"
          />
          Aktif (pesan boleh tampil selama masa tampilnya)
        </label>
      </div>

      {hasil ? (
        <p
          role="status"
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          {pending ? "Menyimpan…" : awal ? "Simpan perubahan" : "Buat pesan"}
        </button>
        {awal ? (
          <Link
            href="/admin/informasi"
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium"
          >
            Batal ubah
          </Link>
        ) : null}
      </div>
    </div>
  );
}

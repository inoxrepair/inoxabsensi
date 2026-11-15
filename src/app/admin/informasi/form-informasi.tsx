"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
          <Label htmlFor="info-judul" className="mb-1.5 block">
            Judul
          </Label>
          <Input
            id="info-judul"
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={100}
            placeholder="Contoh: Libur Hari Raya"
          />
        </div>

        <div>
          <Label htmlFor="info-isi" className="mb-1.5 block">
            Isi informasi
          </Label>
          <Textarea
            id="info-isi"
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Tulis pesan yang tampil di popup karyawan…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="info-cta-label" className="mb-1.5 block">
              Label tombol CTA
            </Label>
            <Input
              id="info-cta-label"
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              maxLength={30}
              placeholder="Mengerti"
            />
          </div>
          <div>
            <Label htmlFor="info-cta-aksi" className="mb-1.5 block">
              Aksi tombol CTA
            </Label>
            <Select value={ctaAksi} onValueChange={(v) => setCtaAksi(v as AksiCta)}>
              <SelectTrigger id="info-cta-aksi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LABEL_AKSI_CTA) as AksiCta[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {LABEL_AKSI_CTA[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {ctaAksi === "tautan" ? (
          <div>
            <Label htmlFor="info-cta-tautan" className="mb-1.5 block">
              Tautan tujuan
            </Label>
            <Input
              id="info-cta-tautan"
              type="url"
              value={ctaTautan}
              onChange={(e) => setCtaTautan(e.target.value)}
              maxLength={500}
              placeholder="https://…"
            />
          </div>
        ) : null}

        {ctaAksi === "halaman" ? (
          <div>
            <Label htmlFor="info-cta-halaman" className="mb-1.5 block">
              Halaman tujuan
            </Label>
            <Select value={ctaHalaman} onValueChange={setCtaHalaman}>
              <SelectTrigger id="info-cta-halaman">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HALAMAN_KARYAWAN.map((h) => (
                  <SelectItem key={h.nilai} value={h.nilai}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="info-mulai" className="mb-1.5 block">
              Mulai tampil
            </Label>
            <InputTanggal
              id="info-mulai"
              value={mulai}
              onChange={setMulai}
              varian="kaca"
            />
          </div>
          <div>
            <Label htmlFor="info-durasi" className="mb-1.5 block">
              Durasi (hari)
            </Label>
            <Input
              id="info-durasi"
              type="number"
              value={durasi}
              onChange={(e) => setDurasi(Number(e.target.value))}
              min={1}
              max={365}
              inputMode="numeric"
            />
            {sampai ? (
              <p className="mt-1.5 text-xs text-muted">
                Tampil {formatTanggal(mulai)}–{formatTanggal(sampai)}.
              </p>
            ) : null}
          </div>
        </div>

        <Label htmlFor="info-aktif" className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            id="info-aktif"
            checked={aktif}
            onCheckedChange={(v) => setAktif(v === true)}
          />
          Aktif (pesan boleh tampil selama masa tampilnya)
        </Label>
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
        <Button
          type="button"
          size="lg"
          onClick={() => void simpan()}
          disabled={pending}
        >
          {pending ? "Menyimpan…" : awal ? "Simpan perubahan" : "Buat pesan"}
        </Button>
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

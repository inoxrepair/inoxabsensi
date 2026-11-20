"use client";

import { useState } from "react";
import { useActionState } from "react";
import { ajukanIzin, type HasilIzin } from "@/app/admin/izin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputTanggal } from "@/components/ui/input-tanggal";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { kompresFoto } from "@/lib/kompres-foto";
import {
  JATAH_CUTI_TAHUNAN,
  JENIS_IZIN,
  LABEL_JENIS_IZIN,
  MAKS_HARI_PENGAJUAN,
} from "@/lib/izin";

export function AjukanIzinForm({
  sisaCuti,
  tahun,
}: {
  /** Sisa cuti tahun berjalan (dari pengajuan cuti yang sudah disetujui). */
  sisaCuti: number;
  tahun: number;
}) {
  const [status, kirim, sedangProses] = useActionState<
    HasilIzin | undefined,
    FormData
  >(ajukanIzin, undefined);
  const [jenis, setJenis] = useState("izin");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [berkasFoto, setBerkasFoto] = useState<Blob | null>(null);
  const [pratinjauFoto, setPratinjauFoto] = useState<string | null>(null);
  const [pesanFoto, setPesanFoto] = useState<string | null>(null);

  // Izin telat dan izin pulang cepat hanya berlaku satu hari.
  const sehari = jenis === "telat" || jenis === "pulang-cepat";

  async function pilihFoto(file: File | undefined) {
    if (!file) return;
    setPesanFoto(null);
    try {
      const terkompresi = await kompresFoto(file);
      if (terkompresi.size > 2_000_000) {
        setPesanFoto("Foto terlalu besar (maks. 2 MB).");
        return;
      }
      setBerkasFoto(terkompresi);
      setPratinjauFoto(URL.createObjectURL(terkompresi));
    } catch {
      setPesanFoto("Foto tidak bisa dibaca. Coba foto lain.");
    }
  }

  /** Foto yang sudah dikompresi dilampirkan ke FormData sebelum dikirim. */
  function kirimForm(fd: FormData) {
    if (berkasFoto) fd.set("buktiFoto", berkasFoto, "bukti.jpg");
    kirim(fd);
  }

  return (
    <form action={kirimForm} className="mt-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="text-xs font-normal text-muted">
          Dari
          <InputTanggal
            name="dari"
            value={dari}
            onChange={setDari}
            required
            className="mt-1.5 w-full"
          />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Sampai
          <InputTanggal
            name={sehari ? undefined : "sampai"}
            value={sehari ? dari : sampai}
            onChange={setSampai}
            disabled={sehari}
            required
            className="mt-1.5 w-full"
          />
          {sehari ? (
            <>
              <input type="hidden" name="sampai" value={dari} />
              <span className="mt-1 block text-[11px]">
                Hanya satu hari untuk jenis ini.
              </span>
            </>
          ) : null}
        </Label>
      </div>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Jenis
        <Select name="jenis" value={jenis} onValueChange={setJenis} required>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Pilih jenis" />
          </SelectTrigger>
          <SelectContent>
            {JENIS_IZIN.map((j) => (
              <SelectItem key={j} value={j}>
                {LABEL_JENIS_IZIN[j]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      {jenis === "telat" ? (
        <Label className="mt-3 block text-xs font-normal text-muted">
          Boleh masuk sampai jam
          <Input
            name="jamMasukDiizinkan"
            type="time"
            required
            className="mt-1.5 w-full"
          />
        </Label>
      ) : null}
      {jenis === "pulang-cepat" ? (
        <Label className="mt-3 block text-xs font-normal text-muted">
          Boleh pulang mulai jam
          <Input
            name="jamPulangDiizinkan"
            type="time"
            required
            className="mt-1.5 w-full"
          />
        </Label>
      ) : null}
      {jenis === "cuti" ? (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs">
          Sisa cuti {tahun}: <b>{sisaCuti} hari</b> dari {JATAH_CUTI_TAHUNAN}{" "}
          hari. Bila disetujui, saldo berkurang sejumlah hari pengajuan.
        </p>
      ) : null}
      <Label className="mt-3 block text-xs font-normal text-muted">
        Alasan (wajib)
        <Textarea name="alasan" rows={3} maxLength={500} required className="mt-1.5 w-full" />
      </Label>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Keterangan bukti (opsional, mis. surat dokter dikirim via WA)
        <Input name="buktiKeterangan" type="text" maxLength={200} className="mt-1.5 w-full" />
      </Label>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Foto bukti (opsional, mis. surat dokter)
        <input
          type="file"
          accept="image/*"
          aria-label="Pilih foto bukti"
          onChange={(e) => void pilihFoto(e.target.files?.[0])}
          className="mt-1.5 w-full text-sm"
        />
      </Label>
      {pratinjauFoto ? (
        <img
          src={pratinjauFoto}
          alt="Pratinjau foto bukti"
          className="mt-2 h-24 rounded-lg object-cover"
        />
      ) : null}
      {pesanFoto ? (
        <p className="mt-2 text-xs text-status-alpa">{pesanFoto}</p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Satu pengajuan maksimal {MAKS_HARI_PENGAJUAN} hari. Izin telat dan
        izin pulang cepat hanya satu hari dan butuh batas jam. Setelah
        disetujui: izin, sakit, dan cuti menandai hari itu (cuti memotong
        saldo), dinas luar menandai hari itu hadir, dan izin telat/pulang
        cepat berlaku saat absen hari itu — tanpa perlu admin mengubah log
        manual.
      </p>

      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}

      <Button type="submit" disabled={sedangProses} size="lg" className="mt-4 w-full rounded-xl">
        {sedangProses ? "Mengirim…" : "Ajukan"}
      </Button>
    </form>
  );
}

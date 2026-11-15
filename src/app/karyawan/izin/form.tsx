"use client";

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
import { MAKS_HARI_PENGAJUAN } from "@/lib/izin";

export function AjukanIzinForm() {
  const [status, kirim, sedangProses] = useActionState<
    HasilIzin | undefined,
    FormData
  >(ajukanIzin, undefined);

  return (
    <form action={kirim} className="mt-4 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="text-xs font-normal text-muted">
          Dari
          <InputTanggal name="dari" required className="mt-1.5 w-full" />
        </Label>
        <Label className="text-xs font-normal text-muted">
          Sampai
          <InputTanggal name="sampai" required className="mt-1.5 w-full" />
        </Label>
      </div>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Jenis
        <Select name="jenis" defaultValue="izin" required>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Pilih jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="izin">Izin</SelectItem>
            <SelectItem value="sakit">Sakit</SelectItem>
          </SelectContent>
        </Select>
      </Label>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Alasan (wajib)
        <Textarea name="alasan" rows={3} maxLength={500} required className="mt-1.5 w-full" />
      </Label>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Keterangan bukti (opsional, mis. surat dokter dikirim via WA)
        <Input name="buktiKeterangan" type="text" maxLength={200} className="mt-1.5 w-full" />
      </Label>
      <p className="mt-3 text-xs text-muted">
        Satu pengajuan maksimal {MAKS_HARI_PENGAJUAN} hari. Setelah disetujui,
        Anda tidak bisa absen masuk pada hari izin itu. Upload surat dokter
        belum tersedia di tahap ini; cukup tulis keterangannya di atas.
      </p>

      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}

      <Button type="submit" disabled={sedangProses} size="lg" className="mt-4 w-full rounded-xl">
        {sedangProses ? "Mengirim…" : "Ajukan izin"}
      </Button>
    </form>
  );
}

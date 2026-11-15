"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buatIzinAdmin, type HasilIzin } from "./actions";
import { InputTanggal } from "@/components/ui/input-tanggal";

export function BuatIzinAdminForm({
  karyawan,
}: {
  karyawan: { id: string; name: string; cabang: string }[];
}) {
  const [status, kirim, sedangProses] = useActionState<
    HasilIzin | undefined,
    FormData
  >(buatIzinAdmin, undefined);

  return (
    <form action={kirim} className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="text-xs font-normal text-muted">
          Karyawan
          <Select name="userId" required>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pilih karyawan…" />
            </SelectTrigger>
            <SelectContent>
              {karyawan.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name} · {k.cabang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <Label className="text-xs font-normal text-muted">
          Tanggal
          <InputTanggal name="tanggal" required className="mt-1.5 w-full" />
        </Label>
      </div>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Jenis
        <Select name="jenis" required defaultValue="izin">
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="izin">Izin</SelectItem>
            <SelectItem value="sakit">Sakit</SelectItem>
          </SelectContent>
        </Select>
      </Label>
      <Label className="mt-3 block text-xs font-normal text-muted">
        Alasan (wajib)
        <Textarea name="alasan" rows={2} maxLength={500} required className="mt-1.5 min-h-0" />
      </Label>
      <p className="mt-3 text-xs text-muted">
        Hanya untuk tanggal yang ada jadwal shift. Hari tanpa jadwal tidak
        dibuat izin, dan hari yang sudah hadir/telat tidak ditimpa.
      </p>
      {status?.pesan ? (
        <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}>
          {status.pesan}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={sedangProses} className="mt-4 w-full rounded-xl">
        {sedangProses ? "Menyimpan…" : "Buat izin"}
      </Button>
    </form>
  );
}

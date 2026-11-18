"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import {
  DAFTAR_PRESET,
  LABEL_PRESET,
  PRESET_SMTP,
  type PresetSmtp,
} from "@/lib/email-smtp-preset";
import type { SetelanEmailSlipTampil } from "@/lib/pengaturan";
import {
  kirimEmailTes,
  simpanSetelanEmail,
  type HasilEmailSlip,
} from "./email-slip-actions";

/**
 * Form setelan email slip gaji di Pengaturan. Sandi tidak pernah dikirim
 * ke client (hanya status sudah-diisi/belum); dikosongkan saat simpan
 * berarti sandi lama tetap dipakai. Memilih preset mengisi host + port
 * bawaannya; mengubah host/port manual mengubah preset jadi "Kustom".
 */
export function FormEmailSlip({ nilaiAwal }: { nilaiAwal: SetelanEmailSlipTampil }) {
  const router = useRouter();
  const [aktif, setAktif] = useState(nilaiAwal.aktif);
  const [preset, setPreset] = useState<PresetSmtp>(nilaiAwal.preset);
  const [host, setHost] = useState(nilaiAwal.host);
  const [port, setPort] = useState(nilaiAwal.port);
  const [pengirim, setPengirim] = useState(nilaiAwal.pengirim);
  const [login, setLogin] = useState(nilaiAwal.login);
  const [emailTesKe, setEmailTesKe] = useState(nilaiAwal.emailTesKe);
  const [sandi, setSandi] = useState("");
  const [hasilSimpan, setHasilSimpan] = useState<HasilEmailSlip>(undefined);
  const [hasilTes, setHasilTes] = useState<HasilEmailSlip>(undefined);
  const [pendingSimpan, setPendingSimpan] = useState(false);
  const [pendingTes, setPendingTes] = useState(false);

  function pilihPreset(p: PresetSmtp) {
    setPreset(p);
    if (p !== "kustom") {
      setHost(PRESET_SMTP[p].host);
      setPort(String(PRESET_SMTP[p].port));
    }
  }

  function ubahHost(nilai: string) {
    setHost(nilai);
    if (preset !== "kustom") setPreset("kustom");
  }

  function ubahPort(nilai: string) {
    setPort(nilai.replace(/[^0-9]/g, "").slice(0, 5));
    if (preset !== "kustom") setPreset("kustom");
  }

  function bangunFormData(): FormData {
    const data = new FormData();
    data.append("aktif", aktif ? "1" : "0");
    data.append("preset", preset);
    data.append("host", host);
    data.append("port", port);
    data.append("pengirim", pengirim);
    data.append("login", login);
    data.append("emailTesKe", emailTesKe);
    data.append("sandi", sandi);
    return data;
  }

  async function simpan() {
    setPendingSimpan(true);
    const res = await simpanSetelanEmail(bangunFormData());
    setHasilSimpan(res);
    setPendingSimpan(false);
    if (res?.ok) {
      setSandi("");
      router.refresh();
    }
  }

  async function tes() {
    setPendingTes(true);
    const res = await kirimEmailTes(bangunFormData());
    setHasilTes(res);
    setPendingTes(false);
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Bila aktif, slip gaji otomatis terkirim ke email karyawan saat ditandai
        dibayar (PDF terlampir). Bila nonaktif, tidak ada email yang terkirim.
      </p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <Label htmlFor="email-slip-aktif" className="text-sm font-medium">
          Kirim email slip otomatis ke karyawan
        </Label>
        <Switch
          id="email-slip-aktif"
          checked={aktif}
          onCheckedChange={setAktif}
          aria-label="Kirim email slip otomatis ke karyawan"
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="email-smtp-preset" className="text-xs font-normal text-muted">
          Penyedia email
        </Label>
        <Select value={preset} onValueChange={(v) => pilihPreset(v as PresetSmtp)}>
          <SelectTrigger id="email-smtp-preset" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAFTAR_PRESET.map((p) => (
              <SelectItem key={p} value={p}>
                {LABEL_PRESET[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <Label htmlFor="email-smtp-host" className="text-xs font-normal text-muted">
            Host SMTP
          </Label>
          <Input
            id="email-smtp-host"
            type="text"
            value={host}
            onChange={(e) => ubahHost(e.target.value)}
            maxLength={200}
            placeholder="smtp.gmail.com"
            autoComplete="off"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="email-smtp-port" className="text-xs font-normal text-muted">
            Port
          </Label>
          <Input
            id="email-smtp-port"
            type="text"
            inputMode="numeric"
            value={port}
            onChange={(e) => ubahPort(e.target.value)}
            placeholder="587"
            autoComplete="off"
            className="mt-1.5 tabular-nums"
          />
          <p className="mt-1 text-xs text-muted">587 = STARTTLS, 465 = TLS.</p>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="email-pengirim" className="text-xs font-normal text-muted">
          Alamat email pengirim
        </Label>
        <Input
          id="email-pengirim"
          type="email"
          value={pengirim}
          onChange={(e) => setPengirim(e.target.value)}
          maxLength={200}
          placeholder="nama@gmail.com"
          autoComplete="off"
          className="mt-1.5"
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="email-smtp-login" className="text-xs font-normal text-muted">
          Login SMTP (opsional)
        </Label>
        <Input
          id="email-smtp-login"
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          maxLength={200}
          placeholder="Kosongkan bila sama dengan alamat pengirim"
          autoComplete="off"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted">
          Untuk Brevo, isi Login dari halaman SMTP &amp; API (bentuk
          xxx@smtp-brevo.com). Untuk Gmail/Outlook, kosongkan saja.
        </p>
      </div>

      <div className="mt-4">
        <Label htmlFor="email-sandi" className="text-xs font-normal text-muted">
          Sandi / App Password pengirim
        </Label>
        <Input
          id="email-sandi"
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          maxLength={200}
          placeholder={
            nilaiAwal.sandiAda
              ? "Sudah diisi — kosongkan bila tidak diubah"
              : "App Password / sandi SMTP"
          }
          autoComplete="new-password"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted">
          Gmail butuh App Password 16 karakter (aktifkan Verifikasi 2 Langkah
          dulu). Outlook.com juga memakai app password. Brevo memakai SMTP
          key (xkeysib-...) dan alamat pengirim harus sudah divalidasi
          sebagai Sender di Brevo.
        </p>
      </div>

      {hasilSimpan ? (
        <p
          role="status"
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${hasilSimpan.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasilSimpan.pesan}
        </p>
      ) : null}

      {hasilTes ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${hasilTes.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasilTes.pesan}
        </p>
      ) : null}

      <div className="mt-4">
        <Label htmlFor="email-tujuan-tes" className="text-xs font-normal text-muted">
          Email tujuan tes (opsional)
        </Label>
        <Input
          id="email-tujuan-tes"
          type="email"
          value={emailTesKe}
          onChange={(e) => setEmailTesKe(e.target.value)}
          maxLength={200}
          placeholder="Kosongkan = kirim ke alamat pengirim"
          autoComplete="off"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted">
          Email tes dikirim ke alamat ini (mis. email pribadimu). Kosongkan
          bila tes cukup dikirim ke alamat pengirim.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          onClick={() => void simpan()}
          disabled={pendingSimpan || pendingTes}
        >
          {pendingSimpan ? "Menyimpan…" : "Simpan setelan email"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => void tes()}
          disabled={pendingSimpan || pendingTes}
        >
          {pendingTes ? "Mengirim…" : "Kirim email tes"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Email tes dikirim ke alamat tujuan tes (atau alamat pengirim bila
        dikosongkan) memakai setelan yang terisi saat ini — tidak harus
        disimpan dulu.
      </p>
    </div>
  );
}

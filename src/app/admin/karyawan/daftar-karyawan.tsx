"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import type { RoleKaryawan } from "@/lib/domain";
import { LABEL_ROLE } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
import { InputTanggal } from "@/components/ui/input-tanggal";
import {
  simpanKaryawan,
  ubahStatusKaryawan,
  type HasilKaryawan,
} from "./actions";

export type CabangOption = { id: string; nama: string };
export type BarisKaryawan = {
  id: string;
  username: string;
  nama: string;
  email: string;
  jabatan: string;
  cabangId: string | null;
  cabang: string;
  role: RoleKaryawan;
  tanggalMasuk: string;
  aktif: boolean;
  /** Centang "Dapat tunjangan makan" (default true). */
  dapatTunjanganMakan: boolean;
  /** Foto profil (data URL) bila karyawan sudah mengunggahnya. */
  foto: string | null;
};

/** Inisial untuk lingkaran pengganti bila karyawan belum punya foto. */
function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

export function DaftarKaryawan({
  rows,
  cabang,
  adminRole,
  adminCabangId,
}: {
  rows: BarisKaryawan[];
  cabang: CabangOption[];
  adminRole: RoleKaryawan;
  adminCabangId: string | null;
}) {
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [pesan, setPesan] = useState<HasilKaryawan | null>(null);
  const [cari, setCari] = useState("");
  const [filterCabang, setFilterCabang] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const tampak = rows.filter((r) => {
    const teks = `${r.nama} ${r.username} ${r.email} ${r.jabatan}`.toLowerCase();
    return (
      teks.includes(cari.toLowerCase()) &&
      (!filterCabang || r.cabangId === filterCabang) &&
      (!filterRole || r.role === filterRole) &&
      (!filterStatus || String(r.aktif) === filterStatus)
    );
  });

  function selesai(h: HasilKaryawan) {
    setDibuka(null);
    setPesan(h);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-3">
        <Input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, username, email, jabatan…"
          className="h-auto min-w-52 flex-1 px-3 py-1.5"
        />
        {adminRole === "super_admin" ? (
          <>
            <Select
              value={filterCabang || "semua"}
              onValueChange={(v) => setFilterCabang(v === "semua" ? "" : v)}
            >
              <SelectTrigger
                aria-label="Filter cabang"
                className="h-auto w-auto px-2.5 py-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua cabang</SelectItem>
                {cabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterRole || "semua"}
              onValueChange={(v) => setFilterRole(v === "semua" ? "" : v)}
            >
              <SelectTrigger
                aria-label="Filter role"
                className="h-auto w-auto px-2.5 py-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua role</SelectItem>
                {Object.entries(LABEL_ROLE).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
        <Select
          value={filterStatus || "semua"}
          onValueChange={(v) => setFilterStatus(v === "semua" ? "" : v)}
        >
          <SelectTrigger
            aria-label="Filter status"
            className="h-auto w-auto px-2.5 py-1.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pesan ? (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            pesan.ok
              ? "bg-status-hadir/10 text-status-hadir"
              : "bg-status-alpa/10 text-status-alpa"
          }`}
        >
          {pesan.pesan}
        </p>
      ) : null}

      {dibuka === "baru" ? (
        <FormKaryawan
          cabang={cabang}
          adminRole={adminRole}
          adminCabangId={adminCabangId}
          onSelesai={selesai}
          onBatal={() => setDibuka(null)}
        />
      ) : (
        <Button
          type="button"
          variant="glass"
          onClick={() => {
            setPesan(null);
            setDibuka("baru");
          }}
          className="h-auto w-full rounded-xl border-dashed px-4 py-3"
        >
          + Tambah karyawan
        </Button>
      )}

      <p className="text-xs text-muted">
        Menampilkan {tampak.length} dari {rows.length} akun.
      </p>

      <ul className="space-y-3">
        {tampak.map((r) =>
          dibuka === r.id ? (
            <li key={r.id}>
              <FormKaryawan
                awal={r}
                cabang={cabang}
                adminRole={adminRole}
                adminCabangId={adminCabangId}
                onSelesai={selesai}
                onBatal={() => setDibuka(null)}
              />
            </li>
          ) : (
            <li key={r.id}>
              <Kartu
                row={r}
                onUbah={() => {
                  setPesan(null);
                  setDibuka(r.id);
                }}
                onPesan={setPesan}
              />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function Kartu({
  row: r,
  onUbah,
  onPesan,
}: {
  row: BarisKaryawan;
  onUbah: () => void;
  onPesan: (h: HasilKaryawan) => void;
}) {
  const [menunggu, mulai] = useTransition();

  return (
    <article className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {r.foto ? (
            <img
              src={r.foto}
              alt={`Foto profil ${r.nama}`}
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-paper"
            >
              {inisial(r.nama)}
            </span>
          )}
          <div>
            <p className="font-medium">{r.nama}</p>
            <p className="text-sm text-muted">
              @{r.username || "belum-diatur"} · {r.email} · {r.jabatan}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onUbah}>
            Ubah
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => onPesan(await ubahStatusKaryawan(r.id, !r.aktif)))
            }
            className="text-muted"
          >
            {menunggu ? "…" : r.aktif ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm md:grid-cols-5">
        <div>
          <dt className="text-xs text-muted">Cabang</dt>
          <dd>{r.cabang}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Role</dt>
          <dd>{LABEL_ROLE[r.role]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Tanggal masuk</dt>
          <dd>{formatTanggal(r.tanggalMasuk)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd>{r.aktif ? "Aktif" : "Nonaktif"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Tunjangan makan</dt>
          <dd>{r.dapatTunjanganMakan ? "Ya" : "Tidak"}</dd>
        </div>
      </dl>
    </article>
  );
}

function FormKaryawan({
  awal,
  cabang,
  adminRole,
  adminCabangId,
  onSelesai,
  onBatal,
}: {
  awal?: BarisKaryawan;
  cabang: CabangOption[];
  adminRole: RoleKaryawan;
  adminCabangId: string | null;
  onSelesai: (h: HasilKaryawan) => void;
  onBatal: () => void;
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, mulai] = useTransition();
  const [role, setRole] = useState<RoleKaryawan>(
    awal?.role ?? (adminRole === "super_admin" ? "karyawan" : "karyawan"),
  );
  // Reset password harus dicentang dulu saat edit: kolom password dalam
  // keadaan mati tidak bisa terisi otomatis oleh browser, dan server juga
  // mengabaikan isinya bila tidak dicentang — jadi pindah cabang tidak
  // bisa diam-diam mengganti password karyawan.
  const [resetPassword, setResetPassword] = useState(false);
  const [password, setPassword] = useState("");
  const namaRef = useRef<HTMLInputElement>(null);
  useEffect(() => namaRef.current?.focus(), []);

  function kirim(form: FormData) {
    setGalat(null);
    mulai(async () => {
      const hasil = await simpanKaryawan(awal?.id ?? null, form);
      if (hasil.ok) onSelesai(hasil);
      else setGalat(hasil.pesan);
    });
  }

  const cabangTerlihat =
    adminRole === "super_admin"
      ? cabang
      : cabang.filter((c) => c.id === adminCabangId);

  return (
    <form action={kirim} className="rounded-2xl border border-ink bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-4">
      <p className="text-sm font-semibold">
        {awal ? `Ubah ${awal.nama}` : "Karyawan baru"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Username">
          <Input
            name="username"
            defaultValue={awal?.username}
            required
            minLength={3}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="contoh: budi.01"
            className="mt-1.5"
          />
        </Field>
        <Field label="Nama">
          <input ref={namaRef} name="name" defaultValue={awal?.nama} required className="mt-1.5 w-full rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-3 py-2 text-sm" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={awal?.email} required className="mt-1.5" />
        </Field>
        <Field label="Jabatan">
          <Input name="jabatan" defaultValue={awal?.jabatan} required className="mt-1.5" />
        </Field>
        <Field label="Tanggal masuk">
          <InputTanggal name="tanggalMasuk" defaultValue={awal?.tanggalMasuk} required varian="kaca" className="mt-1.5 w-full" />
        </Field>
        <Field label="Role">
          <Select name="role" value={role} onValueChange={(v) => setRole(v as RoleKaryawan)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminRole === "super_admin" ? (
                Object.entries(LABEL_ROLE).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="karyawan">Karyawan</SelectItem>
              )}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cabang">
          <Select
            name="cabangId"
            defaultValue={awal?.cabangId ?? adminCabangId ?? ""}
            disabled={role === "super_admin"}
            required={role !== "super_admin"}
          >
            <SelectTrigger className="mt-1.5 disabled:bg-surface disabled:text-muted">
              <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
              {cabangTerlihat.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === "super_admin" ? <input type="hidden" name="cabangId" value="" /> : null}
        </Field>
        <Field label={awal ? "Reset password" : "Password"}>
          <Input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required={!awal}
            disabled={Boolean(awal) && !resetPassword}
            autoComplete="new-password"
            placeholder={awal ? "Mati bila tidak direset" : undefined}
            className="mt-1.5 disabled:bg-surface disabled:text-muted"
          />
          {awal ? (
            <span className="mt-1.5 flex items-center gap-2 text-sm text-ink">
              <Checkbox
                name="resetPassword"
                checked={resetPassword}
                onCheckedChange={(v) => {
                  const dicentang = v === true;
                  setResetPassword(dicentang);
                  if (!dicentang) setPassword("");
                }}
              />
              Reset password karyawan ini
            </span>
          ) : null}
        </Field>
        <div className="flex items-end pb-2">
          <Label htmlFor="aktif" className="flex items-center gap-2 text-sm font-normal">
            <Checkbox id="aktif" name="aktif" defaultChecked={awal?.aktif ?? true} />
            Akun aktif
          </Label>
        </div>
        <div className="flex items-end pb-2">
          <Label htmlFor="dapatTunjanganMakan" className="flex items-center gap-2 text-sm font-normal">
            <Checkbox id="dapatTunjanganMakan" name="dapatTunjanganMakan" defaultChecked={awal?.dapatTunjanganMakan ?? true} />
            Dapat tunjangan makan
          </Label>
        </div>
      </div>

      {galat ? (
        <p role="alert" className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={mengirim}>
          {mengirim ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={onBatal}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label className="text-xs font-normal text-muted">
      {label}
      {children}
    </Label>
  );
}

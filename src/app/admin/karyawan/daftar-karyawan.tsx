"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { RoleKaryawan } from "@/lib/domain";
import { LABEL_ROLE } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
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
};

const INPUT =
  "mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";

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
      <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-paper p-3">
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, username, email, jabatan…"
          className="min-w-52 flex-1 rounded-lg border border-line px-3 py-1.5 text-sm"
        />
        {adminRole === "super_admin" ? (
          <>
            <select
              aria-label="Filter cabang"
              value={filterCabang}
              onChange={(e) => setFilterCabang(e.target.value)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
            >
              <option value="">Semua cabang</option>
              {cabang.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
            >
              <option value="">Semua role</option>
              {Object.entries(LABEL_ROLE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <select
          aria-label="Filter status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
        >
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
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
        <button
          type="button"
          onClick={() => {
            setPesan(null);
            setDibuka("baru");
          }}
          className="w-full rounded-xl border border-dashed border-line bg-paper px-4 py-3 text-sm font-medium"
        >
          + Tambah karyawan
        </button>
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
    <article className="rounded-xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{r.nama}</p>
          <p className="text-sm text-muted">
            @{r.username || "belum-diatur"} · {r.email} · {r.jabatan}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUbah}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
          >
            Ubah
          </button>
          <button
            type="button"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => onPesan(await ubahStatusKaryawan(r.id, !r.aktif)))
            }
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted disabled:opacity-40"
          >
            {menunggu ? "…" : r.aktif ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm md:grid-cols-4">
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
    <form action={kirim} className="rounded-xl border border-ink bg-paper p-4">
      <p className="text-sm font-semibold">
        {awal ? `Ubah ${awal.nama}` : "Karyawan baru"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Username">
          <input
            name="username"
            defaultValue={awal?.username}
            required
            minLength={3}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="contoh: budi.01"
            className={INPUT}
          />
        </Field>
        <Field label="Nama">
          <input ref={namaRef} name="name" defaultValue={awal?.nama} required className={INPUT} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={awal?.email} required className={INPUT} />
        </Field>
        <Field label="Jabatan">
          <input name="jabatan" defaultValue={awal?.jabatan} required className={INPUT} />
        </Field>
        <Field label="Tanggal masuk">
          <input name="tanggalMasuk" type="date" defaultValue={awal?.tanggalMasuk} required className={INPUT} />
        </Field>
        <Field label="Role">
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleKaryawan)}
            className={INPUT}
          >
            {adminRole === "super_admin" ? (
              Object.entries(LABEL_ROLE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))
            ) : (
              <option value="karyawan">Karyawan</option>
            )}
          </select>
        </Field>
        <Field label="Cabang">
          <select
            name="cabangId"
            defaultValue={awal?.cabangId ?? adminCabangId ?? ""}
            disabled={role === "super_admin"}
            required={role !== "super_admin"}
            className={`${INPUT} disabled:bg-surface disabled:text-muted`}
          >
            <option value="">Pilih cabang</option>
            {cabangTerlihat.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
          {role === "super_admin" ? <input type="hidden" name="cabangId" value="" /> : null}
        </Field>
        <Field label={awal ? "Reset password (kosongkan jika tidak diubah)" : "Password"}>
          <input
            name="password"
            type="password"
            minLength={8}
            required={!awal}
            autoComplete="new-password"
            className={INPUT}
          />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="aktif" defaultChecked={awal?.aktif ?? true} className="size-4 accent-ink" />
            Akun aktif
          </label>
        </div>
      </div>

      {galat ? (
        <p role="alert" className="mt-3 rounded-lg bg-status-alpa/10 px-3 py-2 text-sm text-status-alpa">
          {galat}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={mengirim} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
          {mengirim ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onBatal} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
          Batal
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-muted">
      {label}
      {children}
    </label>
  );
}

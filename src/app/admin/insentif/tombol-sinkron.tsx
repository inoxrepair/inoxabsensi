"use client";

import { useActionState } from "react";
import { sinkronInsentifForm, type HasilSinkronInsentif } from "./actions";
import { FormPemetaan } from "./form-pemetaan";

/**
 * Tombol sinkron + hasil sinkron. Hasil WAJIB ditampilkan di halaman:
 * sebelumnya action mengembalikan void dan halaman tidak menampilkan
 * apa-apa, sehingga sinkron yang gagal (mis. kredensial belum diatur)
 * terlihat seperti "tidak terjadi apa-apa".
 *
 * Nama yang tidak cocok ditampilkan beserta form pemetaan: pilih akun
 * karyawannya sekali, simpan, lalu tekan Sinkron lagi — insentif nama
 * itu langsung masuk ke akun yang dipetakan.
 */
export function TombolSinkron({
  periode,
  dari,
  sampai,
  pengguna,
}: {
  periode: string;
  dari: string;
  sampai: string;
  pengguna: Array<{ id: string; name: string }>;
}) {
  const [hasil, kirim, sedangProses] = useActionState<
    HasilSinkronInsentif | undefined,
    FormData
  >(sinkronInsentifForm, undefined);

  const tidakCocok: string[] = hasil?.detail?.tidakDicocokkan ?? [];

  return (
    <div>
      <form action={kirim} className="flex gap-2">
        <input type="hidden" name="periode" defaultValue={periode} />
        <input type="hidden" name="dari" defaultValue={dari} />
        <input type="hidden" name="sampai" defaultValue={sampai} />
        <button
          type="submit"
          disabled={sedangProses}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition disabled:opacity-40"
        >
          {sedangProses ? "Menyinkron…" : "Sinkron Insentif dari inox.my.id"}
        </button>
      </form>
      {hasil?.pesan ? (
        <p
          role="status"
          className={`mt-2 max-w-md rounded-lg px-3 py-2 text-sm ${hasil.ok ? "bg-status-hadir/10 text-status-hadir" : "bg-status-alpa/10 text-status-alpa"}`}
        >
          {hasil.pesan}
        </p>
      ) : null}
      {tidakCocok.length > 0 ? (
        <div className="mt-3 max-w-xl rounded-lg border border-line bg-paper px-3 py-2 text-sm">
          <p className="font-medium">
            Nama berikut belum terhubung ke akun mana pun — hubungkan sekali,
            lalu tekan Sinkron lagi:
          </p>
          {tidakCocok.map((nama) => (
            <FormPemetaan key={nama} namaInox={nama} pengguna={pengguna} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

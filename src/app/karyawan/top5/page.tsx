import { PageHeader } from "@/components/ui/primitives";
import { AvatarApi } from "@/components/ui/avatar-api";
import { formatTanggal } from "@/lib/format";
import { bagiPodium } from "@/lib/top5";
import { ambilTop5 } from "@/lib/top5-data";
import { wajibLogin } from "@/lib/session";

/** Inisial nama untuk avatar bila karyawan belum pasang foto profil. */
function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  const huruf = bagian.slice(0, 2).map((b) => b[0] ?? "");
  return huruf.join("").toUpperCase() || "?";
}

function AvatarBiasa({ foto, nama }: { foto: string | null; nama: string }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt={`Foto ${nama}`}
        className="size-16 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface text-base font-semibold">
      {inisial(nama)}
    </span>
  );
}

/** Tinggi balok podium per peringkat (juara 1 paling tinggi). */
const TINGGI_PODIUM: Record<number, string> = {
  1: "h-20",
  2: "h-14",
  3: "h-10",
};

/** Top 10 performa absensi untuk siklus gajian berjalan. Juara 1–3 tampil
 * sebagai podium (juara 2 kiri, juara 1 tengah dengan cincin api, juara 3
 * kanan), peringkat 4–10 sebagai daftar di bawahnya. Peringkat diurutkan
 * dari jumlah hari valid terbanyak (lihat hitungPeringkat di lib/top5).
 */
export const dynamic = "force-dynamic";

export default async function Top5Page() {
  await wajibLogin();
  const { peringkat, periode, dari, sampai } = await ambilTop5();
  const { podium, sisanya } = bagiPodium(peringkat);

  return (
    <>
      <PageHeader
        title="Top 10 Absensi"
        description={`Peringkat kedisiplinan absen, ${periode} (${formatTanggal(dari)}–${formatTanggal(sampai)}).`}
      />

      {peringkat.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center">
          <p className="text-sm font-medium">Belum ada peringkat</p>
          <p className="mt-1 text-sm text-muted">
            Peringkat muncul setelah ada jadwal shift terjadwal pada periode
            ini.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-2">
            {podium.map(({ item, rank }) => (
              <div
                key={item.userId}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                {rank === 1 ? (
                  <AvatarApi foto={item.foto} nama={item.nama} besar />
                ) : (
                  <AvatarBiasa foto={item.foto} nama={item.nama} />
                )}
                <p className="w-full truncate text-center text-xs font-semibold">
                  {item.nama}
                </p>
                <p className="text-xs text-muted tabular-nums">
                  {item.valid} hari valid
                </p>
                <div
                  className={`flex w-full items-start justify-center rounded-t-2xl pt-2 text-sm font-bold ${
                    TINGGI_PODIUM[rank] ?? "h-10"
                  } ${rank === 1 ? "bg-ink text-paper" : "bg-surface"}`}
                >
                  {rank}
                </div>
              </div>
            ))}
          </div>

          {sisanya.length > 0 ? (
            <ol className="mt-3 space-y-2">
              {sisanya.map((p, i) => (
                <li
                  key={p.userId}
                  className="flex items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 shadow-lg shadow-black/5 dark:shadow-black/50 backdrop-blur-xl px-4 py-2.5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold">
                    {i + 4}
                  </span>
                  {p.foto ? (
                    <img
                      src={p.foto}
                      alt={`Foto ${p.nama}`}
                      loading="lazy"
                      decoding="async"
                      className="size-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold">
                      {inisial(p.nama)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nama}</p>
                    <p className="truncate text-xs text-muted">
                      {p.cabang ?? "Tanpa cabang"} · {p.total} hari terjadwal
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold tabular-nums">
                    {p.valid} hari
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}

      <p className="mt-4 text-xs text-muted">
        Peringkat diurutkan dari jumlah hari valid terbanyak selama periode
        ini (bukan persentase terhadap jadwal masing-masing). Hari dihitung
        bila absen masuk maks. 30 menit sebelum jam shift (tidak telat), ada
        absen pulang, dan log tidak diedit. Shift fleksibel tidak masuk
        penilaian.
      </p>
    </>
  );
}

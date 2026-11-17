import { AvatarApi } from "@/components/ui/avatar-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTanggal } from "@/lib/format";
import { bagiPodium } from "@/lib/top5";
import { ambilTop5, ambilTopPerbaikan } from "@/lib/top5-data";
import { wajibLogin } from "@/lib/session";

/** Inisial nama untuk avatar bila karyawan belum pasang foto profil. */
function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  const huruf = bagian.slice(0, 2).map((b) => b[0] ?? "");
  return huruf.join("").toUpperCase() || "?";
}

/** Tinggi balok podium per peringkat (juara 1 paling tinggi). */
const TINGGI_PODIUM: Record<number, string> = {
  1: "h-20",
  2: "h-14",
  3: "h-10",
};

/**
 * Satu baris peringkat yang siap tampil — dipakai kedua tab. subPodium
 * adalah baris kecil di bawah nama pada podium, subBaris baris kecil di
 * bawah nama pada daftar peringkat 4–10.
 */
type ItemPeringkat = {
  userId: string;
  nama: string;
  foto: string | null;
  cabang: string | null;
  skor: number;
  subPodium: string;
  subBaris: string;
};

/**
 * Podium juara 1–3 (juara 2 kiri, juara 1 tengah dengan cincin api,
 * juara 3 kanan; peringkat 2 & 3 memakai cincin biru yang lebih kecil
 * dan lebih minim animasinya) + daftar peringkat 4–10 di bawahnya.
 */
function TampilanPeringkat({ items }: { items: ItemPeringkat[] }) {
  const { podium, sisanya } = bagiPodium(items);
  return (
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
              <AvatarApi foto={item.foto} nama={item.nama} biru />
            )}
            <p className="w-full truncate text-center text-xs font-semibold">
              {item.nama}
            </p>
            <p className="text-xs font-bold tabular-nums">{item.skor} poin</p>
            <p className="w-full truncate text-center text-xs text-muted">
              {item.subPodium}
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
                <p className="truncate text-xs text-muted">{p.subBaris}</p>
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums">
                {p.skor} poin
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}

/** Kotak empty state saat sebuah tab belum punya peringkat. */
function KotakKosong({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center">
      <p className="text-sm font-medium">{judul}</p>
      <p className="mt-1 text-sm text-muted">{isi}</p>
    </div>
  );
}

/**
 * Top 10 untuk siklus gajian berjalan, dua tab dalam satu menu:
 * - "Absen Disiplin": ranking poin kedisiplinan absen (lihat hitungPoinHari
 *   di lib/top5) — perilaku tab ini tidak berubah;
 * - "Perbaikan": ranking jumlah item/baris transaksi insentif, 1 perbaikan
 *   = 1 poin, tanpa nominal rupiah (lihat hitungPeringkatPerbaikan).
 * Kedua tab memakai periode yang sama.
 */
export const dynamic = "force-dynamic";

export default async function Top5Page() {
  await wajibLogin();
  const [{ peringkat, periode, dari, sampai }, perbaikan] = await Promise.all([
    ambilTop5(),
    ambilTopPerbaikan(),
  ]);

  const absensi: ItemPeringkat[] = peringkat.map((p) => ({
    userId: p.userId,
    nama: p.nama,
    foto: p.foto,
    cabang: p.cabang,
    skor: p.skor,
    subPodium: `${p.valid} hari valid`,
    subBaris: `${p.cabang ?? "Tanpa cabang"} · ${p.valid} dari ${p.total} hari valid`,
  }));
  const perbaikanItems: ItemPeringkat[] = perbaikan.peringkat.map((p) => ({
    userId: p.userId,
    nama: p.nama,
    foto: p.foto,
    cabang: p.cabang,
    skor: p.skor,
    subPodium: p.cabang ?? "Tanpa cabang",
    subBaris: p.cabang ?? "Tanpa cabang",
  }));

  return (
    <>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Top 10</h1>
        <p className="mt-1 text-sm text-muted">
          Peringkat {periode} ({formatTanggal(dari)}–{formatTanggal(sampai)}).
        </p>
      </header>

      <Tabs defaultValue="absensi">
        <TabsList className="inox-tab-pindah relative w-full gap-0">
          <span aria-hidden="true" className="inox-tab-indikator" />
          <TabsTrigger value="absensi" className="flex-1">
            Absen Disiplin
          </TabsTrigger>
          <TabsTrigger value="perbaikan" className="flex-1">
            Perbaikan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="absensi" className="inox-tab-masuk">
          {peringkat.length === 0 ? (
            <KotakKosong
              judul="Belum ada peringkat"
              isi="Peringkat muncul setelah ada jadwal shift terjadwal pada periode ini."
            />
          ) : (
            <>
              <TampilanPeringkat items={absensi} />
              <div className="mt-4 text-xs text-muted">
                <p>Peringkat dihitung dari total poin selama periode ini.</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>Masuk tepat waktu dan absen pulang: 30 poin.</li>
                  <li>Datang lebih awal: +1 poin per menit, maks. +30 poin.</li>
                  <li>
                    Telat: −1 poin per menit, tetap dihitung walau tidak absen
                    pulang. Tidak ada toleransi.
                  </li>
                  <li>
                    0 poin kalau: tidak absen pulang, datang lebih dari 30 menit
                    sebelum shift, atau absennya pernah diedit.
                  </li>
                  <li>Shift fleksibel tidak dihitung.</li>
                </ul>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="perbaikan" className="inox-tab-masuk">
          {perbaikan.peringkat.length === 0 ? (
            <KotakKosong
              judul="Belum ada perbaikan"
              isi="Perbaikan tercatat setelah sinkron insentif berjalan pada periode ini."
            />
          ) : (
            <>
              <TampilanPeringkat items={perbaikanItems} />
              <p className="mt-4 text-xs text-muted">
                1 perbaikan = 1 poin. Dihitung per item/baris transaksi (satu
                nota dengan 2 perbaikan = 2 poin).
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

import { AvatarApi } from "@/components/ui/avatar-api";
import { bagiPodium } from "@/lib/top5";

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
export type ItemPeringkat = {
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
export function TampilanPeringkat({ items }: { items: ItemPeringkat[] }) {
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
export function KotakKosong({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/70 dark:border-white/15 bg-white/60 dark:bg-zinc-900/60 shadow-md shadow-black/5 dark:shadow-black/50 backdrop-blur-xl p-8 text-center">
      <p className="text-sm font-medium">{judul}</p>
      <p className="mt-1 text-sm text-muted">{isi}</p>
    </div>
  );
}

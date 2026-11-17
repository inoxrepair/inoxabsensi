import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTanggal } from "@/lib/format";
import { ambilTop5, ambilTopPerbaikan } from "@/lib/top5-data";
import { wajibLogin } from "@/lib/session";
import {
  KotakKosong,
  TampilanPeringkat,
  type ItemPeringkat,
} from "./tampilan-peringkat";

/**
 * Top 10 untuk siklus gajian berjalan, dua tab dalam satu menu:
 * - "Absen Disiplin": ranking poin kedisiplinan absen (lihat hitungPoinHari
 *   di lib/top5);
 * - "Perbaikan": ranking jumlah item/baris transaksi insentif, 1 perbaikan
 *   = 1 poin, tanpa nominal rupiah (lihat hitungPeringkatPerbaikan).
 * Kedua tab memakai periode yang sama. Kedua ranking diambil server-side
 * saat halaman dibuka (bukan lazy) supaya pindah tab terasa instan —
 * hasilnya di-cache 5 menit di memori server (lihat top5-data), jadi
 * kunjungan berikutnya tidak menghitung ulang.
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
          {perbaikanItems.length === 0 ? (
            <KotakKosong
              judul="Belum ada perbaikan"
              isi="Perbaikan tercatat setelah sinkron insentif berjalan pada periode ini."
            />
          ) : (
            <>
              <TampilanPeringkat items={perbaikanItems} />
              <p className="mt-4 text-xs text-muted">
                1 perbaikan = 1 poin. Dihitung per item/baris transaksi (satu nota
                dengan 2 perbaikan = 2 poin).
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

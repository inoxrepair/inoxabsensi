import { Card, PageHeader, StatCard } from "@/components/ui/primitives";
import { formatTanggal } from "@/lib/format";
import { ambilSemuaInformasi } from "@/lib/informasi-data";
import { akhirInformasi, apakahInformasiAktif, LABEL_AKSI_CTA } from "@/lib/informasi";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";
import { FormInformasi } from "./form-informasi";
import { TombolInformasi } from "./tombol-informasi";

export const dynamic = "force-dynamic";

export default async function AdminInformasiPage({
  searchParams,
}: {
  searchParams: Promise<{ ubah?: string }>;
}) {
  await wajibAkses("informasi");
  const q = await searchParams;
  const hariIni = tanggalLokal();

  const semua = await ambilSemuaInformasi();
  const ubah = q.ubah ? semua.find((p) => p.id === q.ubah) ?? null : null;
  const aktifHariIni = semua.filter((p) => apakahInformasiAktif(p, hariIni));

  return (
    <>
      <PageHeader
        title="Informasi"
        description={
          <>
            Pesan yang muncul sebagai popup setelah karyawan absen masuk.
            Satu pesan tampil ke semua karyawan semua cabang, selama toggle
            aktif dan hari ini masih dalam masa tampilnya.
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Aktif hari ini" value={String(aktifHariIni.length)} />
        <StatCard label="Total pesan" value={String(semua.length)} />
      </div>

      <div className="space-y-6">
        <Card title={ubah ? "Ubah pesan" : "Buat pesan baru"}>
          <FormInformasi awal={ubah} hariIni={hariIni} />
        </Card>

        {semua.length === 0 ? (
          <Card title="Daftar pesan">
            <p className="text-sm text-muted">
              Belum ada pesan informasi. Buat pesan pertama di atas — pesan
              baru tampil di popup karyawan mulai tanggal yang kamu tentukan.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {semua.map((p) => {
              const tampil = apakahInformasiAktif(p, hariIni);
              return (
                <Card key={p.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.judul}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                        {p.isi}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        tampil
                          ? "bg-status-hadir/10 text-status-hadir"
                          : p.aktif
                            ? "bg-status-telat/10 text-status-telat"
                            : "bg-zinc-500/10 text-muted"
                      }`}
                    >
                      {tampil
                        ? "Tampil hari ini"
                        : p.aktif
                          ? "Aktif, belum/sudah lewat masa tampil"
                          : "Nonaktif"}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted">Tampil</dt>
                      <dd>
                        {formatTanggal(p.mulaiTanggal)}–
                        {formatTanggal(akhirInformasi(p.mulaiTanggal, p.durasiHari))}{" "}
                        ({p.durasiHari} hari)
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted">Tombol CTA</dt>
                      <dd>
                        {p.ctaLabel} · {LABEL_AKSI_CTA[p.ctaAksi]}
                        {p.ctaAksi === "tautan" && p.ctaTautan
                          ? ` · ${p.ctaTautan}`
                          : ""}
                        {p.ctaAksi === "halaman" && p.ctaHalaman
                          ? ` · ${p.ctaHalaman}`
                          : ""}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted">Dibuat</dt>
                      <dd>{formatTanggal(p.dibuatPada)}</dd>
                    </div>
                  </dl>

                  <TombolInformasi id={p.id} aktif={p.aktif} item={p} />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
